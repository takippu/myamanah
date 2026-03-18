"use client";

import { useState, useEffect } from "react";
import { FloatingField } from "./floating-field";

interface BalanceAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSave: (amount: number, notes?: string, date?: string) => void;
  type: "debt" | "debtor" | "asset";
  currencyPrefix?: string;
}

export function BalanceAdjustModal({
  isOpen,
  onClose,
  currentBalance,
  onSave,
  type,
  currencyPrefix = "RM",
}: BalanceAdjustModalProps) {
  const [changeAmount, setChangeAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("decrease");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setChangeAmount("");
      setNotes("");
      setDate(new Date().toISOString().split("T")[0]);
      setAdjustmentType(type === "debtor" ? "decrease" : "decrease");
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const handleSave = () => {
    const amount = parseFloat(changeAmount) || 0;
    if (amount <= 0) return;
    
    // For debts: negative = payment (reduce debt), positive = increase
    // For debtors: positive = payment received (reduce amount owed), negative = additional loan
    // For assets: positive = appreciation, negative = depreciation
    let finalAmount = amount;
    if (adjustmentType === "decrease") {
      finalAmount = -amount;
    }
    
    onSave(finalAmount, notes.trim() || undefined, date);
    onClose();
  };

  const getTitle = () => {
    switch (type) {
      case "debt": return "Record Payment";
      case "debtor": return "Record Payment Received";
      case "asset": return "Adjust Asset Value";
    }
  };

  const getIncreaseLabel = () => {
    switch (type) {
      case "debt": return "Debt Increased";
      case "debtor": return "Additional Loan";
      case "asset": return "Value Increased";
    }
  };

  const getDecreaseLabel = () => {
    switch (type) {
      case "debt": return "Payment Made";
      case "debtor": return "Payment Received";
      case "asset": return "Value Decreased";
    }
  };

  const primaryColor = type === "debtor" ? "emerald" : type === "asset" ? "violet" : "rose";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 px-4 pb-6 pt-12 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)]">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">{getTitle()}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Current balance: <span className="font-semibold">{currencyPrefix} {currentBalance.toLocaleString()}</span>
          </p>
        </div>

        {/* Adjustment Type Toggle */}
        <div className="mb-6">
          <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAdjustmentType("decrease")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                adjustmentType === "decrease"
                  ? `bg-${primaryColor}-600 text-white shadow-sm`
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {getDecreaseLabel()}
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType("increase")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                adjustmentType === "increase"
                  ? `bg-${primaryColor}-600 text-white shadow-sm`
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {getIncreaseLabel()}
            </button>
          </div>
        </div>

        {/* Amount Input with +/- */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
            Amount
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setChangeAmount((prev) => {
                const val = parseFloat(prev) || 0;
                return Math.max(0, val - 100).toString();
              })}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-${primaryColor}-100 text-${primaryColor}-700 transition-colors hover:bg-${primaryColor}-200`}
            >
              <span className="material-symbols-outlined text-[24px]">remove</span>
            </button>
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">{currencyPrefix}</span>
                <input
                  type="number"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  placeholder="0"
                  className={`w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-center text-lg font-semibold outline-none focus:border-${primaryColor}-500`}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setChangeAmount((prev) => {
                const val = parseFloat(prev) || 0;
                return (val + 100).toString();
              })}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-${primaryColor}-100 text-${primaryColor}-700 transition-colors hover:bg-${primaryColor}-200`}
            >
              <span className="material-symbols-outlined text-[24px]">add</span>
            </button>
          </div>
        </div>

        {/* Date Input */}
        <div className="mb-4">
          <FloatingField label="Date" labelClassName={`text-${primaryColor}-700`}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-${primaryColor}-500`}
            />
          </FloatingField>
        </div>

        {/* Notes Input */}
        <div className="mb-6">
          <FloatingField label="Notes (Optional)" labelClassName={`text-${primaryColor}-700`}>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Monthly payment"
              className={`w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-${primaryColor}-500`}
            />
          </FloatingField>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!changeAmount || parseFloat(changeAmount) <= 0}
            className={`flex-1 rounded-2xl bg-${primaryColor}-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-${primaryColor}-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
