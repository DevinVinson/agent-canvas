import { useQueries } from "@tanstack/react-query";
import AutomationService from "#/api/automation-service/automation-service.api";
import { useActiveBackend } from "#/contexts/active-backend-context";
import {
  AutomationRunStatus,
  type AutomationRun,
  type AutomationRunsResponse,
} from "#/types/automation";
import { AUTOMATION_RUNS_QUERY_KEY } from "./use-automation-detail";

const RECENT_RUN_SAMPLE_SIZE = 20;

export interface AutomationRunSummary {
  total: number;
  latestRun: AutomationRun | null;
  recentSuccessRate: number | null;
  averageDurationMs: number | null;
  isLoading: boolean;
  isError: boolean;
}

function summarizeRuns(
  data: AutomationRunsResponse | undefined,
  isLoading: boolean,
  isError: boolean,
): AutomationRunSummary {
  const runs = data?.runs ?? [];
  const terminalRuns = runs.filter(
    ({ status }) =>
      status === AutomationRunStatus.COMPLETED ||
      status === AutomationRunStatus.FAILED,
  );
  const completedRuns = terminalRuns.filter(
    ({ status }) => status === AutomationRunStatus.COMPLETED,
  );
  const durations = terminalRuns.flatMap((run) => {
    if (!run.completed_at) return [];
    const duration =
      new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
    return Number.isFinite(duration) && duration >= 0 ? [duration] : [];
  });

  return {
    total: data?.total ?? 0,
    latestRun: runs[0] ?? null,
    recentSuccessRate:
      terminalRuns.length > 0
        ? completedRuns.length / terminalRuns.length
        : null,
    averageDurationMs:
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) /
          durations.length
        : null,
    isLoading,
    isError,
  };
}

/**
 * Fetches a small recent-run sample per visible automation in parallel. The
 * response total provides lifetime volume while the bounded sample powers
 * health and duration signals without pulling large run histories into the UI.
 */
export function useAutomationRunSummaries(
  automationIds: string[],
  enabled = true,
): Map<string, AutomationRunSummary> {
  const active = useActiveBackend();
  const queries = useQueries({
    queries: automationIds.map((id) => ({
      queryKey: [
        ...AUTOMATION_RUNS_QUERY_KEY,
        id,
        { limit: RECENT_RUN_SAMPLE_SIZE, offset: 0 },
        active.backend.id,
        active.orgId,
      ],
      queryFn: () =>
        AutomationService.getAutomationRuns(id, RECENT_RUN_SAMPLE_SIZE, 0),
      staleTime: 60 * 1000,
      enabled: enabled && !!id,
    })),
  });

  return new Map(
    automationIds.map((id, index) => {
      const query = queries[index];
      return [
        id,
        summarizeRuns(query?.data, query?.isLoading ?? false, !!query?.error),
      ];
    }),
  );
}
