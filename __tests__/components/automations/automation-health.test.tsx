import { describe, expect, it } from "vitest";
import {
  formatCompactDuration,
  getAutomationHealth,
} from "#/components/features/automations/automation-health";
import {
  AutomationRunStatus,
  type Automation,
  type AutomationRun,
} from "#/types/automation";
import type { AutomationRunSummary } from "#/hooks/query/use-automation-run-summaries";

const automation: Automation = {
  id: "automation-1",
  name: "Daily digest",
  trigger: { type: "cron", schedule: "0 9 * * *" },
  enabled: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  prompt: "Summarize the day",
};

function run(status: AutomationRunStatus): AutomationRun {
  return {
    id: "run-1",
    status,
    conversation_id: null,
    bash_command_id: null,
    error_detail: null,
    started_at: "2026-01-01T09:00:00Z",
    completed_at: "2026-01-01T09:01:00Z",
  };
}

function summary(status: AutomationRunStatus): AutomationRunSummary {
  return {
    total: 1,
    latestRun: run(status),
    recentSuccessRate: status === AutomationRunStatus.COMPLETED ? 1 : 0,
    averageDurationMs: 60_000,
    isLoading: false,
    isError: false,
  };
}

describe("automation dashboard health", () => {
  it("prioritizes the disabled state over run history", () => {
    expect(
      getAutomationHealth(
        { ...automation, enabled: false },
        summary(AutomationRunStatus.FAILED),
      ),
    ).toBe("disabled");
  });

  it("maps the latest run status to the dashboard signal", () => {
    expect(
      getAutomationHealth(automation, summary(AutomationRunStatus.COMPLETED)),
    ).toBe("healthy");
    expect(
      getAutomationHealth(automation, summary(AutomationRunStatus.FAILED)),
    ).toBe("failing");
    expect(
      getAutomationHealth(automation, summary(AutomationRunStatus.RUNNING)),
    ).toBe("running");
  });

  it("formats dashboard durations compactly", () => {
    expect(formatCompactDuration(null)).toBe("—");
    expect(formatCompactDuration(12_000)).toBe("12s");
    expect(formatCompactDuration(120_000)).toBe("2m");
    expect(formatCompactDuration(5_400_000)).toBe("1.5h");
  });
});
