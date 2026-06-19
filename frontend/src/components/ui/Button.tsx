import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary: 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white',
  secondary: 'glass border border-white/10 hover:border-white/20 text-white/80 hover:text-white',
  ghost: 'hover:bg-white/5 text-white/60 hover:text-white',
  danger: 'bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30',
}
const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => (
    <button ref={ref} disabled={disabled || loading}
      className={cn('rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50', variants[variant], sizes[size], className)}
      {...props}>
      {loading && <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
export default Button
