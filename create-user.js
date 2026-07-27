
import bcrypt from 'bcryptjs';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function createUser() {
  const password = '92789278';
  const passwordHash = await bcrypt.hash(password, 10);
  
  const userData = {
    name: 'Sushil',
    company: 'MCM BPO',
    username: 'sushil',
    email: 'sushil@mcmbpo.com',
    phone: '',
    password_hash: passwordHash,
    role: 'customer',
    user_type: 'user',
    plan_label: 'starter',
    plan_amount: 31,
    plan_min: 250,
    plan_rate: 0.13,
    plan_agents: 2,
    plan_cycle: 'monthly',
    wallet_minutes: 0,
    wallet_usd: 0,
  };

  const result = await pool.query(`
    INSERT INTO users (
      name, company, username, email, phone, password_hash, role, user_type,
      plan_label, plan_amount, plan_min, plan_rate, plan_agents, plan_cycle,
      wallet_minutes, wallet_usd
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      username = EXCLUDED.username,
      phone = EXCLUDED.phone,
      password_hash = EXCLUDED.password_hash,
      updated_at = NOW()
    RETURNING *;
  `, [
    userData.name, userData.company, userData.username, userData.email, userData.phone, userData.password_hash,
    userData.role, userData.user_type, userData.plan_label, userData.plan_amount, userData.plan_min,
    userData.plan_rate, userData.plan_agents, userData.plan_cycle, userData.wallet_minutes, userData.wallet_usd
  ]);

  console.log('User created/updated successfully!');
  console.log('User:', result.rows[0]);
  
  await pool.end();
}

createUser().catch(err => {
  console.error('Error creating user:', err);
  process.exit(1);
});
