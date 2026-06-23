"use client";

// Phase 2.7 admin — small shared form primitives. Internal tooling: clean and
// functional, DESIGN-SYSTEM tokens, not the full brand shell.

import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"bg-white border border-line rounded-card p-5 " + className}>{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold text-textPrimary mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-textSecondary mt-1">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full bg-white border border-line rounded-input px-3 py-2 text-sm text-textPrimary placeholder-textSecondary outline-none focus:border-primary focus:ring-[1.5px] focus:ring-primary";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls + " " + (props.className ?? "")} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputCls + " min-h-[72px] " + (props.className ?? "")} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  // pr-8 reserves room for the native dropdown arrow so the value never overlaps it.
  return <select {...props} className={inputCls + " pr-8 " + (props.className ?? "")} />;
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
  className?: string;
};

export function Button({ children, onClick, type = "button", variant = "primary", disabled, title, className = "" }: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-btn px-3.5 py-2 text-sm font-semibold transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    primary: "bg-primary text-white hover:bg-primaryHover",
    ghost: "bg-subtle text-textPrimary hover:bg-promo",
    danger: "bg-white text-danger border border-line hover:bg-danger hover:text-white",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={base + " " + styles[variant] + " " + className}>
      {children}
    </button>
  );
}

// Tiny square icon-button for up/down reorder etc.
export function IconBtn({ children, onClick, disabled, title }: { children: ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 rounded-md bg-subtle text-textPrimary hover:bg-promo disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center text-sm font-semibold"
    >
      {children}
    </button>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="text-[13px] text-danger mt-2">{message}</p>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-textPrimary">{title}</h1>
        {subtitle && <p className="text-sm text-textSecondary mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
