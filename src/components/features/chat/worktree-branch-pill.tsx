import { cn } from "#/utils/utils";

interface WorktreeBranchPillProps {
  branch: string;
  className?: string;
}

export function WorktreeBranchPill({
  branch,
  className,
}: WorktreeBranchPillProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border border-[var(--oh-border)] bg-[var(--oh-surface)] px-2.5 py-0.5 text-sm leading-5 text-[var(--oh-foreground)] truncate align-middle",
        className,
      )}
      title={branch}
    >
      {branch}
    </span>
  );
}
