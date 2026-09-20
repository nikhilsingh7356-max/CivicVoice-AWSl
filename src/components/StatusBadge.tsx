import React from 'react';
import { CaseStatus, CivicCategory, CivicPriority } from '../types';
import {
  CATEGORY_LABELS,
  CATEGORY_TONES,
  PRIORITY_TONES,
  STATUS_TONES,
} from '../lib/format';

interface BadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClass = (size: 'sm' | 'md') => (size === 'sm' ? 'text-[9.5px] px-1.5' : '');

export const StatusBadge: React.FC<
  { status: CaseStatus } & BadgeProps
> = ({ status, size = 'md', className = '' }) => {
  const t = STATUS_TONES[status] ?? STATUS_TONES.CREATED;
  return (
    <span className={`badge ${t.badge} ${sizeClass(size)} ${className}`} aria-label={`Status: ${t.label}`}>
      <span className={`dot ${t.dot}`} aria-hidden="true" />
      {t.label}
    </span>
  );
};

export const PriorityBadge: React.FC<
  { priority: CivicPriority } & BadgeProps
> = ({ priority, size = 'md', className = '' }) => {
  const t = PRIORITY_TONES[priority] ?? PRIORITY_TONES.LOW;
  return (
    <span className={`badge ${t.badge} ${sizeClass(size)} ${className}`} aria-label={`Priority: ${t.label}`}>
      <span className={`dot ${t.dot}`} aria-hidden="true" />
      {t.label}
    </span>
  );
};

export const CategoryBadge: React.FC<
  { category: CivicCategory } & BadgeProps
> = ({ category, size = 'md', className = '' }) => {
  return (
    <span className={`badge ${sizeClass(size)} ${className}`} style={{ backgroundColor: 'rgba(39,66,82,0.06)', color: '#274252', border: '1px solid rgba(39,66,82,0.18)' }}>
      <span
        className="dot"
        style={{ backgroundColor: CATEGORY_TONES[category] ?? '#616161' }}
        aria-hidden="true"
      />
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
};

export const CategoryLabel: React.FC<{ category: CivicCategory }> = ({ category }) => (
  <span className="text-[13px] text-navy-700">
    {CATEGORY_LABELS[category] ?? category}
  </span>
);