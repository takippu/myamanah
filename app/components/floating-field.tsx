"use client";

import type { ReactNode } from "react";

type FloatingFieldProps = {
  label: string;
  children: ReactNode;
  labelClassName?: string;
  backgroundClassName?: string;
};

export function FloatingField({
  label,
  children,
  labelClassName = "",
  backgroundClassName = "bg-white",
}: FloatingFieldProps) {
  return (
    <div className="relative">
      <span
        className={`pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 ${backgroundClassName} ${labelClassName}`}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
