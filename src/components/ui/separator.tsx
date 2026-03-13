import { cn } from "@/lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function Separator({ className, label, ...props }: SeparatorProps) {
  if (label) {
    return (
      <div className={cn("relative my-5", className)} {...props}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("my-5 h-px w-full bg-border", className)}
      {...props}
    />
  );
}
