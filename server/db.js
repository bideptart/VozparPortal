import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SQLite replacement for the old `pg` Pool, built on Node's native
// node:sqlite (no native compile step, unlike better-sqlite3 — this
// environment has no working Python/build toolchain and no prebuilt
// binary for this Node version). The rest of the codebase talks to this
// through `q(text, params)` / `pool.query(...)` exactly like it did against
// Postgres — this file translates Postgres-flavored SQL and $1-style params
// into what node:sqlite expects, so ~200 call sites across server/*.js
// didn't need touching.

const dataDir = path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.SQLITE_PATH || path.join(dataDir, 'vozper.sqlite3');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// --- ADD COLUMN IF NOT EXISTS -----------------------------------------------
// SQLite's ALTER TABLE has no IF NOT EXISTS for ADD COLUMN. Every call site
// still writes it that way (matching the old Postgres migrations), so we
// intercept the pattern here and guard it with a PRAGMA table_info check.
const ADD_COLUMN_RE = /^\s*ALTER TABLE\s+(\w+)\s+ADD COLUMN IF NOT EXISTS\s+(\w+)\s+([\s\S]+?);?\s*$/i;

function runAddColumnIfNotExists(match) {
  const [, table, column, rest] = match;
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((c) => c.name === column)) return { rows: [], rowCount: 0 };
  // SQLite can't ADD COLUMN with a non-constant default when it's also
  // REFERENCES/other constraints in ways Postgres allows, but our schema only
  // uses simple defaults/REFERENCES which SQLite accepts fine.
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${rest}`);
  return { rows: [], rowCount: 0 };
}

// --- Postgres -> SQLite text translation ------------------------------------
function translate(text) {
  let sql = text;
  sql = sql.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  sql = sql.replace(/::\w+(\[\])?/g, ''); // strip ::int, ::text, ::jsonb, ::int[] casts
  sql = sql.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP'); // plain NOW() only — Postgres `NOW() + INTERVAL` call sites are rewritten at the source instead
  // Postgres allows `UPDATE table alias SET ...` with no AS; SQLite requires
  // `UPDATE table AS alias SET ...`. Only matches the true table-alias case
  // (a bare word directly followed by SET) — plain `UPDATE table SET ...`
  // has nothing to insert AS before and is left alone.
  sql = sql.replace(/\bUPDATE\s+(\w+)\s+(\w+)(\s+SET\b)/gi, (m, table, alias, tail) => (
    /^SET$/i.test(alias) ? m : `UPDATE ${table} AS ${alias}${tail}`
  ));
  return sql;
}

// Expand `col = ANY($N)` (Postgres array-membership) into `col IN (?a,?b,...)`,
// appending the array's elements as fresh numbered params. Returns the
// rewritten SQL and a possibly-extended params array.
function expandAny(sql, params) {
  const out = params ? params.slice() : [];
  const newSql = sql.replace(/=\s*ANY\(\$(\d+)\)/g, (m, nStr) => {
    const idx = Number(nStr) - 1;
    const arr = out[idx];
    if (!Array.isArray(arr)) return m;
    out[idx] = null; // no placeholder will reference this slot anymore
    if (arr.length === 0) return 'IN (NULL)'; // never matches, mirrors ANY() over empty array
    const idxs = arr.map((v) => { out.push(v); return out.length; });
    return `IN (${idxs.map((i) => '?' + i).join(',')})`;
  });
  return { sql: newSql, params: out };
}

function toPositional(sql) {
  return sql.replace(/\$(\d+)/g, (_, n) => '?' + n);
}

function isRowReturning(sql) {
  return /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
}

// node:sqlite doesn't accept JS booleans as bound params.
function bindable(v) {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  return v;
}

function execute(text, params) {
  const addColMatch = text.match(ADD_COLUMN_RE);
  if (addColMatch) return runAddColumnIfNotExists(addColMatch);

  let sql = translate(text);
  let boundParams = params;
  ({ sql, params: boundParams } = expandAny(sql, boundParams));
  sql = toPositional(sql);

  const stmt = db.prepare(sql);
  const bound = (boundParams || []).map(bindable);

  if (isRowReturning(sql)) {
    const rows = bound.length ? stmt.all(...bound) : stmt.all();
    return { rows, rowCount: rows.length };
  }
  const info = bound.length ? stmt.run(...bound) : stmt.run();
  return { rows: [], rowCount: info.changes };
}

// Base tables (users, sessions, user_numbers, ...) live in schema.sql, which
// on the old Postgres setup was applied once by hand — server/index.js's
// runMigrations() only ever ALTERs tables that already exist. A fresh
// SQLite file has nothing, so bootstrap schema.sql here before anything
// else touches the database. All statements are CREATE TABLE/INDEX IF NOT
// EXISTS, so this is safe to run on every boot.
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(translate(schemaSql));

// node:sqlite is synchronous; wrap in a resolved promise so every
// `await q(...)` call site keeps working unchanged.
export const q = (text, params) => Promise.resolve().then(() => execute(text, params));

export const pool = {
  query: (text, params) => q(text, params),
  end: async () => { db.close(); },
  on: () => {}, // no-op — matches the old `pool.on('error', ...)` no-op usage
};
