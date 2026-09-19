import React from 'react';
import { CaseStatus, CivicPriority, CivicCategory } from '../types';
import { AlertTriangle, CheckCircle2, Clock, Lock, MapPinCheck, ShieldAlert, Sparkles, Wrench, FileText } from 'lucide-react';

interface PriorityBadgeProps {
  priority: CivicPriority;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const styles: Record<CivicPriority, { bg: string; text: string; border: string; label: string }> = {
    LOW: {
      bg: 'bg-emerald-50 text-emerald-800',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      label: 'LOW PRIORITY',
    },
    MEDIUM: {
      bg: 'bg-blue-50 text-blue-800',
      text: 'text-blue-800',
      border: 'border-blue-200',
      label: 'MEDIUM PRIORITY',
    },
    HIGH: {
      bg: 'bg-amber-50 text-amber-900',
      text: 'text-amber-900',
      border: 'border-amber-300',
      label: 'HIGH PRIORITY',
    },
    CRITICAL: {
      bg: 'bg-rose-50 text-rose-900',
      text: 'text-rose-900',
      border: 'border-rose-300 font-semibold',
      label: 'CRITICAL PRIORITY',
    },
  };

  const current = styles[priority] || styles.MEDIUM;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  }[size];

  return (
    <span
      id={`badge-priority-${priority.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium tracking-wide ${current.bg} ${current.border} ${sizeClasses}`}
    >
      {priority === 'CRITICAL' && <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
      {priority === 'HIGH' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
      {current.label}
    </span>
  );
};

interface StatusBadgeProps {
  status: CaseStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const styles: Record<CaseStatus, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
    CREATED: {
      bg: 'bg-slate-100 text-slate-800',
      text: 'text-slate-800',
      border: 'border-slate-300',
      icon: <FileText className="w-3.5 h-3.5 text-slate-500" />,
      label: 'CREATED',
    },
    AI_TRIAGED: {
      bg: 'bg-violet-50 text-violet-800',
      text: 'text-violet-800',
      border: 'border-violet-300',
      icon: <Sparkles className="w-3.5 h-3.5 text-violet-600" />,
      label: 'AI TRIAGED',
    },
    ASSIGNED: {
      bg: 'bg-sky-50 text-sky-800',
      text: 'text-sky-800',
      border: 'border-sky-300',
      icon: <Clock className="w-3.5 h-3.5 text-sky-600" />,
      label: 'ASSIGNED',
    },
    FIELD_VERIFICATION: {
      bg: 'bg-cyan-50 text-cyan-800',
      text: 'text-cyan-800',
      border: 'border-cyan-300',
      icon: <MapPinCheck className="w-3.5 h-3.5 text-cyan-600" />,
      label: 'FIELD VERIFICATION',
    },
    IN_PROGRESS: {
      bg: 'bg-amber-50 text-amber-900',
      text: 'text-amber-900',
      border: 'border-amber-300',
      icon: <Wrench className="w-3.5 h-3.5 text-amber-600" />,
      label: 'IN PROGRESS',
    },
    RESOLVED: {
      bg: 'bg-emerald-50 text-emerald-800',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      label: 'RESOLVED',
    },
    CLOSED: {
      bg: 'bg-slate-200 text-slate-700',
      text: 'text-slate-700',
      border: 'border-slate-400',
      icon: <Lock className="w-3.5 h-3.5 text-slate-600" />,
      label: 'CLOSED',
    },
  };

  const current = styles[status] || styles.CREATED;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      id={`badge-status-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${current.bg} ${current.border} ${sizeClasses}`}
    >
      {current.icon}
      {current.label}
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: CivicCategory }> = ({ category }) => {
  return (
    <span
      id={`badge-category-${category.toLowerCase()}`}
      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
    >
      {category}
    </span>
  );
};
