import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function generateShareCode(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 30);
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}
export function generateTeacherInviteCode(): string {
  const y = new Date().getFullYear();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `TCH-${y}-${code}`;
}
export function generateTestInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const p1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const p2 = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `TEST-${p1}-${p2}`;
}
export function formatTime(s: number): string {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
