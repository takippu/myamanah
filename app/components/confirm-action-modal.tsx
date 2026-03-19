"use client";

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  tone?: "danger" | "warning";
};

export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  tone = "danger",
}: ConfirmActionModalProps) {
  if (!open) {
    return null;
  }

  const accentClasses =
    tone === "warning"
      ? {
          iconWrap: "bg-amber-100 text-amber-700",
          confirm: "bg-amber-600 hover:bg-amber-700",
          icon: "warning",
        }
      : {
          iconWrap: "bg-rose-100 text-rose-700",
          confirm: "bg-rose-600 hover:bg-rose-700",
          icon: "delete",
        };

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-slate-950/45 px-4 pb-6 pt-12 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)]">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accentClasses.iconWrap}`}>
            <span className="material-symbols-outlined">{accentClasses.icon}</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm leading-relaxed text-slate-600">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-colors ${accentClasses.confirm}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
