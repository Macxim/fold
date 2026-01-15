'use client';

import { useCurrency } from '../context/currency-context';

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-0 border border-border">
      <button
        onClick={() => setCurrency('USD')}
        className={`cursor-pointer w-full px-3 py-1.5 text-xs font-mono transition-colors ${
          currency === 'USD'
            ? 'bg-foreground text-background'
            : 'bg-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        USD ($)
      </button>
      <button
        onClick={() => setCurrency('EUR')}
        className={`cursor-pointer w-full px-3 py-1.5 text-xs font-mono transition-colors ${
          currency === 'EUR'
            ? 'bg-foreground text-background'
            : 'bg-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        EUR (€)
      </button>
    </div>
  );
}
