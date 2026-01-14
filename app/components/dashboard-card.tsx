import React from "react";

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export function DashboardCard({ children, className = "", title, action }: DashboardCardProps) {
  return (
    <div className={`bg-card border border-border p-6 flex flex-col h-full ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-6">
          {title && (
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
