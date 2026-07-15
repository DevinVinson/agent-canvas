import { type ReactNode } from "react";

export function BackendSetupNote({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--oh-border)] bg-base-primary p-4">
      <h4 className="text-sm font-medium text-content-2">{title}</h4>
      <div className="mt-2 text-sm leading-relaxed text-[var(--oh-muted)]">
        {children}
      </div>
    </div>
  );
}
