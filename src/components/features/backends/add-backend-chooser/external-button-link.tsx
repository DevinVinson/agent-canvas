import { type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "#/utils/utils";
import { formControlButtonClassName } from "#/utils/form-control-classes";

export function ExternalButtonLink({
  href,
  children,
  variant = "secondary",
  testId,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  testId: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      className={cn(
        formControlButtonClassName,
        "w-full",
        variant === "primary"
          ? "bg-primary text-[var(--oh-color-base)] hover:opacity-80"
          : "border border-[var(--oh-border)] bg-base-secondary text-white hover:bg-surface-raised",
      )}
    >
      {children}
      <ExternalLink className="size-4 shrink-0" aria-hidden />
    </a>
  );
}
