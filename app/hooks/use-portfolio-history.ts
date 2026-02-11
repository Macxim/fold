import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { HistoryEntry } from '@/types/portfolio';
import { MOCK_HISTORY, isDemoMode } from '@/lib/mock-data';

export function usePortfolioHistory(totalValue: number) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load local history on mount
  useEffect(() => {
    // Check demo mode synchronously
    const demoMode = isDemoMode();

    // Return mock data in demo mode
    if (demoMode) {
      setHistory(MOCK_HISTORY);
      return;
    }
    const saved = localStorage.getItem('fold-history-v2');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const fetchRemoteHistory = useCallback(async () => {
    // Skip Supabase fetch in demo mode
    if (isDemoMode()) return;

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

        setHistory(prev => {
          const combined = [...prev];
          formatted.forEach(remoteEntry => {
            const index = combined.findIndex(h => h.date === remoteEntry.date);
            if (index !== -1) {
              combined[index] = remoteEntry;
            } else {
              combined.push(remoteEntry);
            }
          });
          const sorted = combined.sort((a, b) => a.date.localeCompare(b.date));
          localStorage.setItem('fold-history-v2', JSON.stringify(sorted));
          return sorted;
        });
      }
    } catch (e) {
      console.error('[usePortfolioHistory] Error fetching:', e);
    }
  }, []);

  // Sync to Supabase when totalValue changes
  useEffect(() => {
    // Check demo mode synchronously
    const demoMode = isDemoMode();

    if (totalValue === 0 || demoMode) return;

    const today = new Date().toISOString().split('T')[0];

    const updateLocalAndSync = async () => {
      setHistory(prev => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry?.date === today && lastEntry.value === totalValue) return prev;

        const filtered = prev.filter(h => h.date !== today);
        const updated = [...filtered, { date: today, value: totalValue }];
        localStorage.setItem('fold-history-v2', JSON.stringify(updated));
        return updated;
      });

      try {
        await supabase
          .from('portfolio_history')
          .upsert({ date: today, total_value: totalValue }, { onConflict: 'date' });
      } catch (e) {
        console.error('[usePortfolioHistory] Sync failed:', e);
      }
    };

    const timer = setTimeout(updateLocalAndSync, 2000);
    return () => clearTimeout(timer);
  }, [totalValue]);

  const migrateLocalToSupabase = useCallback(async (currentTotalValue: number) => {
    if (isDemoMode()) return { success: false, message: 'Cannot migrate in demo mode' };

    const today = new Date().toISOString().split('T')[0];
    const savedHistory = localStorage.getItem('fold-history-v2');

    try {
      let historyToSync: { date: string; total_value: number }[] = [];
      if (savedHistory) {
        const local: HistoryEntry[] = JSON.parse(savedHistory);
        historyToSync = local.map(h => ({ date: h.date, total_value: h.value }));
      }

      if (!historyToSync.find(h => h.date === today)) {
        historyToSync.push({ date: today, total_value: currentTotalValue });
      }

      const { error } = await supabase
        .from('portfolio_history')
        .upsert(historyToSync, { onConflict: 'date' });

      if (error) throw error;
      return { success: true, message: `Synced ${historyToSync.length} entries` };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, message };
    }
  }, []);

  return { history, setHistory, fetchRemoteHistory, migrateLocalToSupabase };
}
