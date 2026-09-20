import React from 'react';

export const Panel: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    flush?: boolean;
  }
> = ({ title, subtitle, actions, flush, className = '', children, ...rest }) => {
  return (
    <section className={`panel ${className}`} {...rest}>
      {(title || actions) && (
        <div className="panel-header">
          <div className="min-w-0">
            {title && <h3 className="section-title">{title}</h3>}
            {subtitle && <p className="subtitle mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? '' : 'panel-body'}>{children}</div>
    </section>
  );
};