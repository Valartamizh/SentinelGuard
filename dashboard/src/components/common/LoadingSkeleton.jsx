export default function LoadingSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full space-y-3 p-4">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-[var(--bg-elevated)] rounded-md flex-1"
              style={{ opacity: 1 - rIdx * 0.15 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
