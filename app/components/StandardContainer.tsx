import React from 'react';

interface StandardContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg';
}

export default function StandardContainer({ 
  children, 
  className = '', 
  padding = 'lg',
  shadow = 'md'
}: StandardContainerProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-lg',
    lg: 'shadow-xl'
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${paddingClasses[padding]} ${shadowClasses[shadow]} ${className}`}>
      {children}
    </div>
  );
}

export { StandardContainer };

// Componente específico para tablas
export function TableContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <StandardContainer className={className}>
      {children}
    </StandardContainer>
  );
}

// Componente específico para headers de página
export function PageHeader({ 
  title, 
  subtitle, 
  actions,
  className = '' 
}: { 
  title: string; 
  subtitle?: string; 
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <StandardContainer className={`border-b border-gray-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 text-base">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </StandardContainer>
  );
}

// Componente específico para métricas/cards
export function MetricsContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <StandardContainer className={className}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Resumen</h2>
      <div className="grid grid-cols-5 gap-3">
        {children}
      </div>
    </StandardContainer>
  );
}
