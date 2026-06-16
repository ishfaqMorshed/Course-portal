"use client";

import type { ReactNode } from "react";

export function BtnPrimary({
  children,
  onClick,
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={"inline-flex items-center justify-center gap-2 whitespace-nowrap bg-primary hover:bg-primaryHover disabled:opacity-60 text-white text-sm font-semibold rounded-[10px] px-5 py-3 transition-colors " + className}
    >
      {children}
    </button>
  );
}

export function BtnSecondary({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={"inline-flex items-center justify-center gap-2 whitespace-nowrap bg-white border-[1.5px] border-primary text-primary text-sm font-semibold rounded-[10px] px-5 py-[10.5px] hover:bg-primarySoft transition-colors " + className}
    >
      {children}
    </button>
  );
}
