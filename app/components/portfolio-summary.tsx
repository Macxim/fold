'use client';

import { DashboardCard } from "./dashboard-card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoryEntry } from "../hooks/use-portfolio";

interface PortfolioSummaryProps {
  totalValue: number;
  history: HistoryEntry[];
  lastUpdate: string | null;
}

export function PortfolioSummary({ totalValue, history, lastUpdate }: PortfolioSummaryProps) {
  // safe calculation for trend
  const lastMonthValue = history.length >= 30
    ? history[history.length - 30].value
    : history.length > 0 ? history[0].value : totalValue;

  const changePercent = lastMonthValue > 0
    ? ((totalValue - lastMonthValue) / lastMonthValue * 100).toFixed(2)
    : "0.00";

  const isPositive = parseFloat(changePercent) >= 0;

  return (
    <DashboardCard title="Total Balance" className="col-span-1 md:col-span-2 relative overflow-hidden group">
      <div className="flex flex-col justify-between h-full z-10 relative">
        <div className="flex justify-between items-start">
            <div>
            <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl md:text-5xl lg:text-6xl font-mono text-foreground tracking-tighter">
                ${Math.floor(totalValue).toLocaleString()}
                </span>
                <span className="text-base md:text-xl text-muted-foreground font-mono">
                .{(totalValue % 1).toFixed(2).substring(2)}
                </span>
            </div>
            <div className="flex items-center gap-3 mt-3">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium font-mono border ${isPositive ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                {isPositive ? '+' : ''}{changePercent}%
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">vs last month</span>
            </div>
            </div>
            {lastUpdate && (
                <div className="text-right hidden sm:block">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">Updated</div>
                    <div className="text-xs font-mono text-foreground opacity-70">{lastUpdate}</div>
                </div>
            )}
        </div>

        {/* Recharts Graph */}
        <div className="h-32 w-full mt-6 -mb-2 -ml-2">
            {history.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#d4b483" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#d4b483" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '0px',
                            fontFamily: 'var(--font-geist-mono)',
                            fontSize: '12px'
                          }}
                          itemStyle={{ color: '#f4f4f5' }}
                          formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']}
                          labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#d4b483"
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 4, fill: '#d4b483' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground font-mono">
                    Collecting history data...
                </div>
            )}
        </div>
      </div>
    </DashboardCard>
  );
}
