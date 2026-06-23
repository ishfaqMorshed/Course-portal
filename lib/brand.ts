// Single source of truth for the displayed brand name. Change this one value
// (or set NEXT_PUBLIC_BRAND_NAME in the environment) to rebrand the entire
// portal + admin in one place — no component edits required. The NEXT_PUBLIC_
// prefix makes the override available in both server and client components.
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "The Academy";
