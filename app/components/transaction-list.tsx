"use client";

import { useState } from "react";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  notes?: string;
  balanceAfter?: number;
  valueAfter?: number;
  createdAt: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
  currencyPrefix?: string;
  type: "debt" | "debtor" | "asset";
}

export function TransactionList({
  transactions,
  onDelete,
  currencyPrefix = "RM",
  type,
}: TransactionListProps) {
  const [displayCount, setDisplayCount] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const displayedTransactions = sortedTransactions.slice(0, displayCount);
  const hasMore = sortedTransactions.length > displayCount;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 10);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getAmountColor = (amount: number) => {
    if (type === "debt") {
      // For debts: negative (payment) is good (emerald), positive (increase) is bad (rose)
      return amount < 0 ? "text-emerald-600" : "text-rose-600";
    } else if (type === "debtor") {
      // For debtors: positive (payment received) is good (emerald), negative (more loan) is bad (rose)
      return amount > 0 ? "text-emerald-600" : "text-rose-600";
    } else {
      // For assets: positive is good (emerald), negative is bad (rose)
      return amount > 0 ? "text-emerald-600" : "text-rose-600";
    }
  };

  const getAmountPrefix = (amount: number) => {
    if (amount > 0) return "+";
    return "";
  };

  const handleDelete = (id: string) => {
    if (deletingId === id) {
      onDelete?.(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      // Auto-reset after 3 seconds
      setTimeout(() => setDeletingId((current) => current === id ? null : current), 3000);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <span className="material-symbols-outlined text-slate-400">history</span>
        </div>
        <p className="text-sm text-slate-500">No transactions yet</p>
        <p className="mt-1 text-xs text-slate-400">Record payments or adjustments to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {displayedTransactions.map((transaction, index) => (
        <div
          key={transaction.id}
          className={`group relative rounded-xl p-3 transition-colors hover:bg-slate-50 ${
            index !== displayedTransactions.length - 1 ? "border-b border-slate-100" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Left: Date */}
            <div className="min-w-[80px]">
              <p className="text-xs text-slate-500">{formatDate(transaction.date)}</p>
            </div>

            {/* Center: Amount */}
            <div className="flex-1 px-3">
              <p className={`text-sm font-semibold ${getAmountColor(transaction.amount)}`}>
                {getAmountPrefix(transaction.amount)}
                {currencyPrefix} {Math.abs(transaction.amount).toLocaleString()}
              </p>
              {transaction.notes && (
                <p className="mt-0.5 text-xs text-slate-400 italic truncate max-w-[150px]">
                  {transaction.notes}
                </p>
              )}
            </div>

            {/* Right: Balance After + Delete */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-slate-400">Balance</p>
                <p className="text-xs font-medium text-slate-600">
                  {currencyPrefix} {(transaction.balanceAfter ?? transaction.valueAfter ?? 0).toLocaleString()}
                </p>
              </div>
              
              {onDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(transaction.id)}
                  className={`ml-2 flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                    deletingId === transaction.id
                      ? "bg-rose-100 text-rose-700"
                      : "bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-600"
                  }`}
                  title={deletingId === transaction.id ? "Click again to confirm" : "Delete transaction"}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {deletingId === transaction.id ? "delete_forever" : "delete"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Load more ({sortedTransactions.length - displayCount} remaining)
        </button>
      )}
    </div>
  );
}
