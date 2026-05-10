import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { HistoryEntry } from '@/types/portfolio';

export function usePortfolioHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const fetchRemoteHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_history')
        .select('date, total_value')
        .order('date', { ascending: true });

      if (error) throw error;

      if (data) {
        const formatted: HistoryEntry[] = data.map(item => ({
          date: item.date,
          value: Number(item.total_value)
        }));
        setHistory(formatted);
      }
    } catch (e) {
      console.error('[usePortfolioHistory] Error fetching:', e);
    }
  }, []);

  return { history, fetchRemoteHistory };
}
