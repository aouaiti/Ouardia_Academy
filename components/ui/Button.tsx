import { cn } from "@/lib/utils";

const variants = {
  default: "bg-surface border border-border text-foreground",
  primary: "bg-primary text-white hover:bg-primary-dark",
  danger: "bg-danger text-white hover:bg-red-700",
  ghost: "bg-transparent text-muted hover:bg-border/50",
  outline: "border border-border bg-surface text-foreground hover:bg-background",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({ variant = "default", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
