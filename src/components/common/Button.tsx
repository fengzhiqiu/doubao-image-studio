import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-violet-500 to-violet-600 text-white hover:from-violet-400 hover:to-violet-500 disabled:opacity-40 shadow-md shadow-violet-900/50',
  secondary: 'bg-white/[0.07] text-white/65 hover:bg-white/[0.12] hover:text-white/85 border border-white/[0.1]',
  ghost: 'text-white/40 hover:bg-white/[0.06] hover:text-white/70',
  danger: 'text-red-400 hover:bg-red-500/15',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5',
  md: 'h-9 px-5 text-sm gap-2',
  lg: 'h-10 px-6 text-sm gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 cursor-pointer select-none ${
        variantClass[variant]
      } ${sizeClass[size]} ${className}`}
      style={{
        paddingLeft: size === 'sm' ? '10px' : size === 'md' ? '18px' : '24px',
        paddingRight: size === 'sm' ? '10px' : size === 'md' ? '18px' : '24px',
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
