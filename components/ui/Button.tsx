import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'green' | 'orange'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-bol-yellow text-black hover:bg-[#e8d400] active:bg-[#d6c400]',
  secondary: 'bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-700',
  danger:    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
  ghost:     'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800 active:bg-zinc-700',
  green:     'bg-white text-black hover:bg-zinc-100 active:bg-zinc-200',
  orange:    'bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-700',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-xl',
  xl: 'px-6 py-4 text-base rounded-2xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-100 touch-manipulation select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-bol-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
