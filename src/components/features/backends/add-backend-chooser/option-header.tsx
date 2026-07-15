import { type ComponentType } from "react";
import { modalTitleLgMediumClassName } from "#/utils/modal-classes";

export function OptionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--oh-border)] bg-tertiary">
        <Icon className="size-5 text-primary" aria-hidden />
      </div>
      <div className="min-w-0">
        <h3 className={modalTitleLgMediumClassName}>{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-[var(--oh-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}
