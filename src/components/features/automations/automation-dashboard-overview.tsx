import { Activity, Bot, CircleAlert, Timer } from "lucide-react";
import type { Automation } from "#/types/automation";
import type { AutomationRunSummary } from "#/hooks/query/use-automation-run-summaries";
import { getAutomationHealth } from "./automation-health";

const OVERVIEW_ARIA_LABEL = "Automation overview";

interface AutomationDashboardOverviewProps {
  automations: Automation[];
  summaries: Map<string, AutomationRunSummary>;
}

export function AutomationDashboardOverview({
  automations,
  summaries,
}: AutomationDashboardOverviewProps) {
  const activeCount = automations.filter(({ enabled }) => enabled).length;
  const needsAttention = automations.filter(
    (automation) =>
      getAutomationHealth(automation, summaries.get(automation.id)) ===
      "failing",
  ).length;
  const loadedSummaries = automations
    .map(({ id }) => summaries.get(id))
    .filter(
      (summary): summary is AutomationRunSummary =>
        !!summary && !summary.isLoading && !summary.isError,
    );
  const totalRuns = loadedSummaries.reduce(
    (total, summary) => total + summary.total,
    0,
  );
  const durationSamples = loadedSummaries
    .map(({ averageDurationMs }) => averageDurationMs)
    .filter((duration): duration is number => duration !== null);
  const averageDuration =
    durationSamples.length > 0
      ? durationSamples.reduce((sum, duration) => sum + duration, 0) /
        durationSamples.length
      : null;

  const cards = [
    {
      label: "Automations",
      value: automations.length.toLocaleString(),
      detail: `${activeCount.toLocaleString()} active`,
      icon: Bot,
    },
    {
      label: "Needs attention",
      value: needsAttention.toLocaleString(),
      detail:
        needsAttention === 0 ? "No latest-run failures" : "Latest run failed",
      icon: CircleAlert,
    },
    {
      label: "Total runs",
      value:
        loadedSummaries.length === 0 && automations.length > 0
          ? "—"
          : totalRuns.toLocaleString(),
      detail: "Across loaded automations",
      icon: Activity,
    },
    {
      label: "Average duration",
      value:
        averageDuration === null
          ? "—"
          : averageDuration < 60_000
            ? `${Math.max(1, Math.round(averageDuration / 1000))}s`
            : `${Math.round(averageDuration / 60_000)}m`,
      detail: "Recent completed runs",
      icon: Timer,
    },
  ];

  return (
    <section
      className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      aria-label={OVERVIEW_ARIA_LABEL}
    >
      {cards.map(({ label, value, detail, icon: Icon }) => (
        <div
          key={label}
          className="rounded-xl border border-[var(--oh-border)] bg-base-secondary p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-tertiary-light">
              {label}
            </span>
            <Icon className="size-4 text-tertiary-alt" aria-hidden />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-tertiary-alt" title={detail}>
            {detail}
          </p>
        </div>
      ))}
    </section>
  );
}
