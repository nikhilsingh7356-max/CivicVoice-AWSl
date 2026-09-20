import React from 'react';
import { Inbox, TriangleAlert, RotateCw } from 'lucide-react';

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-cv-line bg-cv-subtle text-navy-300">
      {icon ?? <Inbox size={20} aria-hidden="true" />}
    </div>
    <h3 className="text-[14px] font-semibold text-navy-900">{title}</h3>
    {description && <p className="subtitle mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  description: string;
  onRetry?: () => void;
}> = ({ title = 'Something went wrong', description, onRetry }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
      <TriangleAlert size={20} aria-hidden="true" />
    </div>
    <h3 className="text-[14px] font-semibold text-navy-900">{title}</h3>
    <p className="subtitle mt-1 max-w-md">{description}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn btn-secondary btn-sm mt-4">
        <RotateCw size={13} aria-hidden="true" />
        Try again
      </button>
    )}
  </div>
);

export const SkeletonRow: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="divide-y divide-cv-line" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <div className="skeleton h-2.5 w-24" />
        <div className="skeleton h-2.5 flex-1" />
        <div className="skeleton h-2.5 w-20" />
        <div className="skeleton h-4 w-16 rounded-full" />
      </div>
    ))}
  </div>
);

export const MetricSkeleton: React.FC = () => (
  <div className="metric" aria-hidden="true">
    <div className="skeleton h-4 w-20" />
    <div className="skeleton mt-2 h-7 w-12" />
  </div>
);