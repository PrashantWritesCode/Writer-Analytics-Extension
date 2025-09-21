import * as React from "react";
import clsx from "clsx";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow",
        className
      )}
      {...props}
    />
  )
);

Card.displayName = "Card";

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("p-4", className)} {...props} />
  )
);

CardContent.displayName = "CardContent";
