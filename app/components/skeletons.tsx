"use client";

export function CardSkeleton() {
  return (
    <div className="glass-card rounded-[1.8rem] border border-[#e4e6eb] bg-white/60 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-2xl bg-slate-300" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-slate-300" />
          <div className="h-3 w-full rounded bg-slate-300" />
        </div>
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-slate-300 to-slate-400 p-6 animate-pulse">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="h-11 w-11 rounded-2xl bg-slate-200" />
          <div className="h-6 w-16 rounded-full bg-slate-200" />
        </div>
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-10 w-32 rounded bg-slate-200" />
          <div className="h-2 w-full rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="glass-card rounded-3xl border border-[#e7eaee] bg-white/60 p-6 animate-pulse space-y-3">
      <div className="h-4 w-24 rounded bg-slate-300" />
      <div className="h-10 w-full rounded-2xl bg-slate-300" />
      <div className="h-10 w-full rounded-2xl bg-slate-300" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-10 rounded-2xl bg-slate-300" />
        <div className="h-10 rounded-2xl bg-slate-300" />
      </div>
      <div className="h-20 w-full rounded-2xl bg-slate-300" />
      <div className="h-12 w-full rounded-[1.3rem] bg-slate-300" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="glass-card rounded-3xl border border-[#e7eaee] bg-white/60 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-300" />
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-300" />
            <div className="h-5 w-32 rounded bg-slate-300" />
          </div>
        </div>
        <div className="h-6 w-16 rounded bg-slate-300" />
      </div>
      <div className="rounded-2xl bg-slate-100 p-3 space-y-2">
        <div className="h-4 w-full rounded bg-slate-300" />
        <div className="h-3 w-24 rounded bg-slate-300" />
      </div>
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass-card rounded-2xl border border-[#e4e6eb] bg-white/60 p-4 animate-pulse">
          <div className="h-8 w-12 mx-auto rounded bg-slate-300 mb-2" />
          <div className="h-3 w-16 mx-auto rounded bg-slate-300" />
        </div>
      ))}
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-[1.75rem] border border-[#e4e6eb] bg-white/60 p-5 animate-pulse">
      <div className="flex items-center gap-5">
        <div className="h-14 w-14 rounded-2xl bg-slate-300" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-slate-300" />
          <div className="h-3 w-48 rounded bg-slate-300" />
        </div>
      </div>
      <div className="h-6 w-6 rounded bg-slate-300" />
    </div>
  );
}

export function QuickActionSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6 px-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex-shrink-0 flex items-center gap-3 rounded-2xl border border-[#e4e6eb] bg-white/60 px-6 py-4 animate-pulse">
          <div className="h-8 w-8 rounded-xl bg-slate-300" />
          <div className="h-4 w-20 rounded bg-slate-300" />
        </div>
      ))}
    </div>
  );
}

export function ChecklistItemSkeleton() {
  return (
    <div className="glass-card rounded-[1.8rem] border border-[#e4e6eb] bg-white/60 p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-2xl bg-slate-300" />
          <div className="space-y-2 pt-1">
            <div className="h-4 w-28 rounded bg-slate-300" />
            <div className="h-3 w-48 rounded bg-slate-300" />
          </div>
        </div>
        <div className="h-6 w-14 rounded bg-slate-300" />
      </div>
    </div>
  );
}
