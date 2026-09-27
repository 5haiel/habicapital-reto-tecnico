import { useId, type ReactElement, type ReactNode } from 'react'
import { cloneElement } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ControlProps = {
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Label + control + hint/error, wired for screen readers: the control gets
 * the id, `aria-invalid` and `aria-describedby` pointing at the message.
 */
export function FormField({
  label,
  optional,
  hint,
  error,
  action,
  className,
  children,
}: {
  label: string
  optional?: boolean
  hint?: ReactNode
  error?: string | null
  action?: ReactNode
  className?: string
  children: ReactElement<ControlProps>
}) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
        </Label>
        {action}
      </div>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <p
          id={messageId}
          className={cn('text-xs', error ? 'font-medium text-destructive' : 'text-muted-foreground')}
        >
          {message}
        </p>
      )}
    </div>
  )
}
