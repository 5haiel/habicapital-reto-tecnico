import type { ComponentProps } from 'react'

import { Input } from '@/components/ui/input'
import { formatPesosInput } from '@/lib/currency'
import { cn } from '@/lib/utils'

/** Amount field in Colombian format: "$" prefix, thousands dots added as you type. */
export function MoneyInput({
  value,
  onValueChange,
  className,
  size = 'default',
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'size'> & {
  value: string
  onValueChange: (value: string) => void
  size?: 'default' | 'lg'
}) {
  return (
    <div className="relative">
      <span
        className={cn(
          'pointer-events-none absolute inset-y-0 left-3 flex items-center font-heading font-semibold text-muted-foreground',
          size === 'lg' && 'left-4 text-xl',
        )}
        aria-hidden
      >
        $
      </span>
      <Input
        {...props}
        inputMode="decimal"
        autoComplete="off"
        placeholder={props.placeholder ?? '0'}
        value={value}
        onChange={(e) => onValueChange(formatPesosInput(e.target.value))}
        className={cn(
          'amount pl-7',
          size === 'lg' && 'h-14 pl-9 text-2xl font-semibold md:text-2xl',
          className,
        )}
      />
    </div>
  )
}
