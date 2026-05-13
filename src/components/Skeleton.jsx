/**
 * Skeleton loader components
 *
 * Usage:
 *   import { SkeletonCard, SkeletonList, SkeletonDashboard } from "../components/Skeleton";
 *
 *   if (loading) return <SkeletonDashboard />;
 */

/* ─── Primitive ─── */
function Sk({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

/* ─── Stat Card Skeleton ─── */
export function SkeletonCard() {
  return (
    <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-3 w-20" />
          <Sk className="h-6 w-32" />
        </div>
        <Sk className="h-9 w-9 rounded-lg" />
      </div>
      <Sk className="h-3 w-24" />
    </div>
  );
}

/* ─── List Item Skeleton ─── */
export function SkeletonListItem() {
  return (
    <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4 flex items-start gap-3">
      <Sk className="h-9 w-9 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Sk className="h-3.5 w-40" />
        <Sk className="h-3 w-24" />
      </div>
      <Sk className="h-4 w-20 rounded-md" />
    </div>
  );
}

/* ─── Chart Area Skeleton ─── */
export function SkeletonChart() {
  return (
    <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Sk className="h-4 w-40" />
        <div className="flex gap-2">
          <Sk className="h-6 w-16 rounded-full" />
          <Sk className="h-6 w-16 rounded-full" />
          <Sk className="h-6 w-16 rounded-full" />
        </div>
      </div>
      {/* Fake bar chart */}
      <div className="flex items-end gap-2 h-48 pt-4">
        {[60, 85, 45, 70, 95, 55].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end gap-1">
            <Sk className="w-full" style={{ height: `${h}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-around">
        {[...Array(6)].map((_, i) => (
          <Sk key={i} className="h-3 w-10" />
        ))}
      </div>
    </div>
  );
}

/* ─── Dashboard Full Skeleton ─── */
export function SkeletonDashboard() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Hero card */}
      <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-5 space-y-3">
        <Sk className="h-3 w-24" />
        <Sk className="h-8 w-48" />
        <div className="flex gap-4 pt-1">
          <Sk className="h-3 w-32" />
          <Sk className="h-3 w-32" />
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>

      {/* Chart */}
      <SkeletonChart />

      {/* Recent tx list */}
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <SkeletonListItem key={i} />)}
      </div>
    </div>
  );
}

/* ─── List Page Skeleton ─── */
export function SkeletonListPage({ count = 5 }) {
  return (
    <div className="space-y-3">
      {/* Summary card */}
      <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-5 space-y-3">
        <Sk className="h-3 w-28" />
        <Sk className="h-7 w-40" />
        <div className="flex gap-4 pt-1">
          <Sk className="h-3 w-28" />
          <Sk className="h-3 w-28" />
        </div>
      </div>
      {/* List items */}
      {[...Array(count)].map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}
