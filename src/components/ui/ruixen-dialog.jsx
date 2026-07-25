"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ImagePlus } from "lucide-react";

import { useCharacterLimit } from "@/hooks/use-character-limit";
import { useImageUpload } from "@/hooks/use-image-upload";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const BRAND_GRADIENT = "bg-[linear-gradient(135deg,#0ea5e9_0%,#6366f1_55%,#8b5cf6_110%)]";

const initialsOf = (name) => {
  if (!name) return "NA";
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "NA";
};

export default function Dialog01({ user, onSave, saveLabel = "Save Changes" }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    company: "",
  });

  const supportsAbout = Object.prototype.hasOwnProperty.call(user || {}, "about");
  const {
    value: about,
    characterCount,
    handleChange,
    maxLength,
    reset: resetAbout,
  } = useCharacterLimit({
    maxLength: 180,
    initialValue: typeof user?.about === "string" ? user.about : "",
  });

  const {
    previewUrl,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
  } = useImageUpload();

  const accountType = useMemo(
    () => String(user?.userType || user?.role || "user").replace(/-/g, " "),
    [user],
  );

  useEffect(() => {
    if (!open) return;
    setForm({
      name: user?.name || "",
      username: user?.username || "",
      email: user?.email || "",
      phone: user?.phone || "",
      company: user?.company || "",
    });
    resetAbout(typeof user?.about === "string" ? user.about : "");
  }, [open, user, resetAbout]);

  const profileImage = previewUrl || user?.profileImage || user?.avatarUrl || user?.image || "";

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      username: form.username,
      email: form.email,
      phone: form.phone,
      company: form.company,
      ...(supportsAbout ? { about } : {}),
    };
    const ok = await onSave?.(payload);
    setSaving(false);
    if (ok !== false) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary/25 bg-primary/10 text-primary hover:bg-primary hover:text-white">
          Edit Profile
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden border-primary/25 bg-background text-foreground shadow-[0_24px_80px_-30px_rgba(4,107,210,0.6)] sm:max-w-xl">
        <div className="h-36 bg-[radial-gradient(circle_at_top_left,rgba(37,117,252,0.7),transparent_42%),linear-gradient(135deg,#046BD2_0%,#0B1220_85%)]" />

        <div className="-mt-14 px-6">
          <div className="flex justify-center sm:justify-start">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profileImage} alt={form.name || user?.name || "Profile"} />
                <AvatarFallback className="bg-primary text-base font-semibold text-white">
                  {initialsOf(form.name || user?.name)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleThumbnailClick}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-background text-primary transition hover:bg-primary hover:text-white"
                aria-label="Change profile picture"
              >
                <ImagePlus size={16} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
            </div>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 pb-6">
          <DialogHeader className="mt-4 text-left">
            <DialogTitle className="text-3xl font-semibold">Account Profile</DialogTitle>
            <DialogDescription className="text-sm text-body">
              Edit the profile details already available on this account.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`${id}-name`}>Full Name</Label>
                <Input
                  id={`${id}-name`}
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`${id}-username`}>Username</Label>
                <Input
                  id={`${id}-username`}
                  value={form.username}
                  onChange={(event) => setField("username", event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`${id}-email`}>Email</Label>
                <Input
                  id={`${id}-email`}
                  type="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`${id}-phone`}>Phone</Label>
                <Input
                  id={`${id}-phone`}
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`${id}-company`}>Company</Label>
                <Input
                  id={`${id}-company`}
                  value={form.company}
                  onChange={(event) => setField("company", event.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`${id}-account-type`}>Account Type</Label>
                <Input
                  id={`${id}-account-type`}
                  value={accountType}
                  disabled
                />
              </div>
            </div>

            {supportsAbout && (
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-about`}>About</Label>
                <Textarea
                  id={`${id}-about`}
                  value={about}
                  onChange={handleChange}
                  maxLength={maxLength}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {maxLength - characterCount} characters left
                </p>
              </div>
            )}

            <DialogFooter className="border-t border-border/80 bg-background px-0 pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <button
                type="submit"
                disabled={saving}
                className="group relative overflow-hidden inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium text-white border border-white/25 transition duration-200 ease-out hover:scale-105 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className={`absolute inset-0 ${BRAND_GRADIENT} opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300`} aria-hidden="true" />
                <span className="relative">{saving ? "Saving..." : saveLabel}</span>
              </button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
