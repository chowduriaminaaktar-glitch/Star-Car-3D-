import { Coins } from 'lucide-react';

interface CoinBadgeProps {
  coins: number;
  compact?: boolean;
}

export function CoinBadge({ coins, compact = false }: CoinBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 bg-slate-950/90 border border-amber-400/35 rounded-xl shadow-lg ${
        compact ? 'px-3 py-1.5' : 'px-4 py-2'
      }`}
    >
      <Coins className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="font-mono-tabular font-bold text-amber-300 text-sm sm:text-base tracking-tight whitespace-nowrap">
        {coins.toLocaleString()}
      </span>
    </div>
  );
}
