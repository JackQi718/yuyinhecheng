import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  showCount?: boolean;
  maxLength?: number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, showCount, maxLength, ...props }, ref) => {
    const [count, setCount] = React.useState(0);

    return (
      <div className="relative w-full">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          maxLength={maxLength}
          onChange={(e) => {
            setCount(e.target.value.length);
            props.onChange?.(e);
          }}
          {...props}
        />
        {showCount && (
          <div className="absolute bottom-1 right-2 text-xs text-muted-foreground">
            {count}{maxLength ? `/${maxLength}` : ''}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
