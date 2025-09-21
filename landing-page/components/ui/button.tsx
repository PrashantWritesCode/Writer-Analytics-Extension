import * as React from "react";
import clsx from "clsx";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "px-4 py-2 rounded-lg font-medium shadow-sm transition-colors",
        "bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500",
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
