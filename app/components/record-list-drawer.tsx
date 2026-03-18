"use client";

import type { ReactNode } from "react";

type RecordListDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function RecordListDrawer({ open, title, onClose, children, footer }: RecordListDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <style jsx>{`
        @keyframes drawer-backdrop-in {
          from {
            background-color: rgba(2, 6, 23, 0);
          }
          to {
            background-color: rgba(2, 6, 23, 0.35);
          }
        }

        @keyframes drawer-sheet-in {
          from {
            opacity: 0;
            transform: translateY(2rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        className="fixed inset-0 z-[55] bg-slate-950/35"
        style={{ animation: "drawer-backdrop-in 240ms ease-out" }}
      >
      <button
        type="button"
        aria-label={`Close ${title}`}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[2rem] border border-slate-200 bg-white shadow-[0_-18px_48px_-24px_rgba(15,23,42,0.45)]"
        style={{ animation: "drawer-sheet-in 300ms ease-out" }}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="px-6 pb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500">{title}</h2>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 pb-32 pt-2">{children}</div>
        {footer ? (
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[1.5rem] border-t border-slate-200 bg-white/95 px-6 pb-8 pt-4 backdrop-blur">
            {footer}
          </div>
        ) : null}
      </div>
      </div>
    </>
  );
}
