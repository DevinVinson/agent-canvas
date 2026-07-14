import { AutomationRunStatus, type Automation } from "#/types/automation";
import type { AutomationRunSummary } from "#/hooks/query/use-automation-run-summaries";
import { cn } from "#/utils/utils";

export type AutomationHealth =
  | "healthy"
  | "failing"
  | "running"
  | "disabled"
  | "never-run"
  | "unknown";

export function getAutomationHealth(
  automation: Automation,
  summary?: AutomationRunSummary,
): AutomationHealth {
  if (!automation.enabled) return "disabled";
  if (summary?.isError) return "unknown";
  if (!summary || summary.isLoading) return "unknown";
  if (!summary.latestRun) return "never-run";
  if (summary.latestRun.status === AutomationRunStatus.FAILED) return "failing";
  if (
    summary.latestRun.status === AutomationRunStatus.PENDING ||
    summary.latestRun.status === AutomationRunStatus.RUNNING
  ) {
    return "running";
  }
  return "healthy";
}

const HEALTH_STYLES: Record<AutomationHealth, string> = {
  healthy: "border-green-500/25 bg-green-500/10 text-green-300",
  failing: "border-red-500/30 bg-red-500/10 text-red-300",
  running: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  disabled: "border-white/10 bg-white/5 text-tertiary-light",
  "never-run": "border-amber-500/25 bg-amber-500/10 text-amber-200",
  unknown: "border-white/10 bg-white/5 text-tertiary-light",
};

const HEALTH_LABELS: Record<AutomationHealth, string> = {
  healthy: "Healthy",
  failing: "Failing",
  running: "Running",
  disabled: "Disabled",
  "never-run": "Never run",
  unknown: "Checking",
};

export function AutomationHealthBadge({
  health,
}: {
  health: AutomationHealth;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        HEALTH_STYLES[health],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {HEALTH_LABELS[health]}
    </span>
  );
}

export function formatCompactDuration(durationMs: number | null): string {
  if (durationMs === null) return "—";
  if (durationMs < 60_000)
    return `${Math.max(1, Math.round(durationMs / 1000))}s`;
  if (durationMs < 3_600_000) return `${Math.round(durationMs / 60_000)}m`;
  return `${(durationMs / 3_600_000).toFixed(1)}h`;
}

export function formatLastRun(date: string | null | undefined): string {
  if (!date) return "Never";
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return "Never";
  const diffMs = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(time).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      new Date(time).getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  });
}
