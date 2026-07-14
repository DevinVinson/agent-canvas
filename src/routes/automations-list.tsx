import {
  useState,
  useMemo,
  useCallback,
  useRef,
  type ChangeEvent,
} from "react";
import { FileUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { I18nKey } from "#/i18n/declaration";
import {
  displaySuccessToast,
  displaySuccessToastWithLink,
  displayErrorToast,
} from "#/utils/custom-toast-handlers";
import {
  useAutomations,
  useToggleAutomation,
  useDeleteAutomation,
  useDispatchAutomation,
  useImportAutomation,
} from "#/hooks/query/use-automations";
import { useAutomationHealth } from "#/hooks/query/use-automation-health";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { SearchInput } from "#/components/features/automations/search-input";
import { AutomationGroup } from "#/components/features/automations/automation-group";
import { AutomationViewToggle } from "#/components/features/automations/automation-view-toggle";
import {
  readStoredAutomationViewMode,
  writeStoredAutomationViewMode,
  type AutomationViewMode,
} from "#/components/features/automations/automation-view-mode";
import { AutomationCardSkeleton } from "#/components/features/automations/automation-card-skeleton";
import { EmptyState } from "#/components/features/automations/empty-state";
import { ErrorState } from "#/components/features/automations/error-state";
import { BackendNotConfigured } from "#/components/features/automations/backend-not-configured";
import { DeleteConfirmationModal } from "#/components/features/automations/delete-confirmation-modal";
import { EditAutomationModal } from "#/components/features/automations/detail/edit-automation-modal";
import { AddAutomationModal } from "#/components/features/automations/add-automation-modal";
import { ImportAutomationModal } from "#/components/features/automations/import-automation-modal";
import { BrandButton } from "#/components/features/settings/brand-button";
import { useTracking } from "#/hooks/use-tracking";
import type { Automation, AutomationSpec } from "#/types/automation";
import {
  getAutomationExportFilename,
  parseAutomationFile,
  serializeAutomation,
} from "#/utils/automation-export";
import { downloadBlob } from "#/utils/utils";
import { AutomationDashboardOverview } from "#/components/features/automations/automation-dashboard-overview";
import { useAutomationRunSummaries } from "#/hooks/query/use-automation-run-summaries";
import { getAutomationHealth } from "#/components/features/automations/automation-health";
import { AutomationsPageLayout } from "#/components/features/automations/automations-page-layout";
import { EnumFilterDropdown } from "#/components/shared/filters/enum-filter-dropdown";

const PAGE_SIZE = 50;
const DASHBOARD_COPY = {
  title: "Dashboard",
  subtitle: "Health, activity, and run performance across your automations.",
  filterStatus: "Filter by status",
  allStatuses: "All statuses",
  active: "Active",
  needsAttention: "Needs attention",
  disabled: "Disabled",
  filterTrigger: "Filter by trigger",
  allTriggers: "All triggers",
  scheduled: "Scheduled",
  eventDriven: "Event-driven",
  sort: "Sort automations",
  latestRun: "Latest run",
  mostRuns: "Most runs",
  name: "Name",
  noMatches: "No automations match these filters",
  clearFilters: "Clear filters",
} as const;

type StatusFilter = "all" | "active" | "failing" | "disabled";
type TriggerFilter = "all" | "schedule" | "event";
type DashboardSort = "last-run" | "name" | "runs";

const STATUS_FILTER_OPTIONS: readonly StatusFilter[] = [
  "all",
  "active",
  "failing",
  "disabled",
];
const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: DASHBOARD_COPY.allStatuses,
  active: DASHBOARD_COPY.active,
  failing: DASHBOARD_COPY.needsAttention,
  disabled: DASHBOARD_COPY.disabled,
};
const TRIGGER_FILTER_OPTIONS: readonly TriggerFilter[] = [
  "all",
  "schedule",
  "event",
];
const TRIGGER_FILTER_LABELS: Record<TriggerFilter, string> = {
  all: DASHBOARD_COPY.allTriggers,
  schedule: DASHBOARD_COPY.scheduled,
  event: DASHBOARD_COPY.eventDriven,
};
const DASHBOARD_SORT_OPTIONS: readonly DashboardSort[] = [
  "last-run",
  "runs",
  "name",
];
const DASHBOARD_SORT_LABELS: Record<DashboardSort, string> = {
  "last-run": DASHBOARD_COPY.latestRun,
  runs: DASHBOARD_COPY.mostRuns,
  name: DASHBOARD_COPY.name,
};

export default function AutomationsList() {
  const { t } = useTranslation("openhands");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<AutomationViewMode>(() =>
    readStoredAutomationViewMode(),
  );
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
  const [sortBy, setSortBy] = useState<DashboardSort>("last-run");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<Automation | null>(null);
  const [isAddAutomationOpen, setIsAddAutomationOpen] = useState(false);
  const [importSpec, setImportSpec] = useState<AutomationSpec | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const active = useActiveBackend();
  // Edit is a local-backend-only feature in MVP — cloud automations
  // are managed elsewhere and we don't yet surface them here.
  const canEdit = active.backend.kind === "local";

  const {
    data: healthData,
    isLoading: isHealthLoading,
    refetch: refetchHealth,
  } = useAutomationHealth();

  const isBackendHealthy = healthData?.status === "ok";

  // Only fetch automations if the backend is healthy
  const { data, isLoading, isError, refetch } = useAutomations({
    limit,
    offset: 0,
    enabled: isBackendHealthy,
  });
  const { trackPrebuiltAutomationEnabled, trackAutomationExported } =
    useTracking();
  const toggleMutation = useToggleAutomation();
  const deleteMutation = useDeleteAutomation();
  const dispatchMutation = useDispatchAutomation();
  const importMutation = useImportAutomation();
  const automationIds = useMemo(
    () => data?.automations.map(({ id }) => id) ?? [],
    [data?.automations],
  );
  const runSummaries = useAutomationRunSummaries(
    automationIds,
    isBackendHealthy,
  );

  const filtered = useMemo(() => {
    if (!data?.automations) return [];
    const q = searchQuery.toLowerCase();
    const matches = data.automations.filter((automation) => {
      const matchesSearch =
        !q ||
        automation.name.toLowerCase().includes(q) ||
        (automation.prompt ?? "").toLowerCase().includes(q) ||
        automation.repository?.toLowerCase().includes(q) ||
        automation.model?.toLowerCase().includes(q);
      const matchesTrigger =
        triggerFilter === "all" ||
        (triggerFilter === "event"
          ? automation.trigger.type === "event"
          : automation.trigger.type !== "event");
      const health = getAutomationHealth(
        automation,
        runSummaries.get(automation.id),
      );
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && automation.enabled) ||
        (statusFilter === "disabled" && !automation.enabled) ||
        (statusFilter === "failing" && health === "failing");
      return matchesSearch && matchesTrigger && matchesStatus;
    });

    return [...matches].sort((left, right) => {
      if (sortBy === "name") return left.name.localeCompare(right.name);
      if (sortBy === "runs") {
        return (
          (runSummaries.get(right.id)?.total ?? 0) -
          (runSummaries.get(left.id)?.total ?? 0)
        );
      }
      const rightTime = new Date(
        runSummaries.get(right.id)?.latestRun?.started_at ??
          right.last_triggered_at ??
          0,
      ).getTime();
      const leftTime = new Date(
        runSummaries.get(left.id)?.latestRun?.started_at ??
          left.last_triggered_at ??
          0,
      ).getTime();
      return rightTime - leftTime;
    });
  }, [
    data?.automations,
    runSummaries,
    searchQuery,
    sortBy,
    statusFilter,
    triggerFilter,
  ]);

  const activeAutomations = useMemo(
    () => filtered.filter((a) => a.enabled),
    [filtered],
  );
  const inactive = useMemo(
    () => filtered.filter((a) => !a.enabled),
    [filtered],
  );

  const handleToggle = (id: string, currentEnabled: boolean) => {
    const willEnable = !currentEnabled;
    toggleMutation.mutate({ id, enabled: willEnable });
    if (willEnable) {
      const automation = data?.automations.find((a) => a.id === id);
      trackPrebuiltAutomationEnabled({
        automationId: id,
        automationName: automation?.name ?? id,
      });
    }
  };

  const handleRunNow = (id: string) => {
    dispatchMutation.mutate(id, {
      onSuccess: () => {
        displaySuccessToast(t(I18nKey.AUTOMATIONS$RUN_NOW_SUCCESS));
      },
      onError: (error) => {
        const message = isAxiosError(error)
          ? (error.response?.data as { message?: string } | undefined)
              ?.message ||
            error.message ||
            t(I18nKey.AUTOMATIONS$RUN_NOW_ERROR)
          : (error as Error).message || t(I18nKey.AUTOMATIONS$RUN_NOW_ERROR);
        displayErrorToast(message);
      },
    });
  };

  const handleDeleteRequest = (id: string) => {
    const automation = data?.automations.find((a) => a.id === id);
    if (automation) {
      setDeleteTarget({ id, name: automation.name });
    }
  };

  const handleEditRequest = (id: string) => {
    const automation = data?.automations.find((a) => a.id === id);
    if (automation) {
      setEditTarget(automation);
    }
  };

  const handleExport = (automation: Automation) => {
    const contents = `${JSON.stringify(serializeAutomation(automation), null, 2)}\n`;
    downloadBlob(
      new Blob([contents], { type: "application/json" }),
      getAutomationExportFilename(automation),
    );
    trackAutomationExported({ backendKind: active.backend.kind });
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text()) as unknown;
      } catch {
        displayErrorToast(t(I18nKey.AUTOMATIONS$IMPORT_INVALID_JSON));
        return;
      }
      setImportSpec(parseAutomationFile(parsed));
    } catch (error) {
      displayErrorToast(
        error instanceof Error ? error.message : t(I18nKey.ERROR$GENERIC),
      );
    }
  };

  const handleImportConfirm = () => {
    if (!importSpec) return;

    importMutation.mutate(
      { ...importSpec, enabled: false },
      {
        onSuccess: (created) => {
          setImportSpec(null);
          displaySuccessToastWithLink(
            t(I18nKey.AUTOMATIONS$IMPORT_SUCCESS, { name: created.name }),
            t(I18nKey.AUTOMATIONS$IMPORT_VIEW),
            `/automations/${encodeURIComponent(created.id)}`,
          );
        },
        onError: (error) => {
          const detail = isAxiosError(error)
            ? (error.response?.data as { detail?: unknown } | undefined)?.detail
            : undefined;
          const message =
            typeof detail === "string"
              ? detail
              : isAxiosError(error)
                ? error.message
                : t(I18nKey.ERROR$GENERIC);
          displayErrorToast(message);
        },
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleViewModeChange = useCallback((view: AutomationViewMode) => {
    setViewMode(view);
    writeStoredAutomationViewMode(view);
  }, []);

  const hasMore = data ? data.total > data.automations.length : false;
  const hasNoAutomations =
    !isLoading && !isError && data?.automations.length === 0;

  // Show loading state while checking health
  if (isHealthLoading) {
    return (
      <AutomationsPageLayout>
        <div>
          <h1 className="text-xl font-semibold text-content">
            {DASHBOARD_COPY.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{DASHBOARD_COPY.subtitle}</p>
          <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <AutomationCardSkeleton key={`skeleton-${String(i)}`} />
            ))}
          </div>
        </div>
      </AutomationsPageLayout>
    );
  }

  // Show backend not configured state if health check failed
  if (!isBackendHealthy) {
    return (
      <AutomationsPageLayout>
        <div>
          <h1 className="text-xl font-semibold text-content">
            {DASHBOARD_COPY.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{DASHBOARD_COPY.subtitle}</p>
          <BackendNotConfigured onRetry={refetchHealth} />
        </div>
      </AutomationsPageLayout>
    );
  }

  return (
    <AutomationsPageLayout>
      <div>
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-content">
              {DASHBOARD_COPY.title}
            </h1>
            <p className="mt-1 text-sm text-muted">{DASHBOARD_COPY.subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <BrandButton
              type="button"
              variant="secondary"
              testId="automations-import-automation"
              className="whitespace-nowrap"
              onClick={() => importInputRef.current?.click()}
              startContent={<FileUp className="size-4" aria-hidden />}
            >
              {t(I18nKey.AUTOMATIONS$IMPORT)}
            </BrandButton>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              data-testid="automations-import-file"
              onChange={handleImportFile}
            />
            <BrandButton
              type="button"
              variant="secondary"
              testId="automations-add-automation"
              className="whitespace-nowrap"
              onClick={() => setIsAddAutomationOpen(true)}
            >
              {t(I18nKey.AUTOMATIONS$ADD_AUTOMATION)}
            </BrandButton>
          </div>
        </div>

        {!isLoading && !isError && data ? (
          <div className="mt-6">
            <AutomationDashboardOverview
              automations={data.automations}
              summaries={runSummaries}
            />
          </div>
        ) : null}

        {/* Search */}
        <div className="mt-6 flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            className="lg:max-w-md"
          />
          <div className="flex flex-wrap items-stretch gap-2 lg:ml-auto">
            <EnumFilterDropdown
              testId="automations-status-filter"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
              labelByValue={STATUS_FILTER_LABELS}
              ariaLabel={DASHBOARD_COPY.filterStatus}
            />
            <EnumFilterDropdown
              testId="automations-trigger-filter"
              value={triggerFilter}
              onChange={setTriggerFilter}
              options={TRIGGER_FILTER_OPTIONS}
              labelByValue={TRIGGER_FILTER_LABELS}
              ariaLabel={DASHBOARD_COPY.filterTrigger}
            />
            <EnumFilterDropdown
              testId="automations-sort"
              value={sortBy}
              onChange={setSortBy}
              options={DASHBOARD_SORT_OPTIONS}
              labelByValue={DASHBOARD_SORT_LABELS}
              ariaLabel={DASHBOARD_COPY.sort}
            />
          </div>
          <AutomationViewToggle
            view={viewMode}
            onChange={handleViewModeChange}
            disabled={hasNoAutomations}
          />
        </div>

        {/* Content */}
        <div className="mt-6 flex flex-col gap-6">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <AutomationCardSkeleton key={`skeleton-${String(i)}`} />
              ))}
            </div>
          )}

          {isError && !isLoading && <ErrorState onRetry={refetch} />}

          {hasNoAutomations && <EmptyState />}

          {!isLoading &&
            !isError &&
            data &&
            data.automations.length > 0 &&
            filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--oh-border)] px-6 py-10 text-center">
                <p className="text-sm font-medium text-white">
                  {DASHBOARD_COPY.noMatches}
                </p>
                <button
                  type="button"
                  className="mt-2 text-sm text-primary hover:underline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTriggerFilter("all");
                  }}
                >
                  {DASHBOARD_COPY.clearFilters}
                </button>
              </div>
            )}

          {!isLoading && !isError && data && data.automations.length > 0 && (
            <>
              <AutomationGroup
                title={t(I18nKey.AUTOMATIONS$ACTIVE)}
                count={activeAutomations.length}
                automations={activeAutomations}
                view={viewMode}
                onToggle={handleToggle}
                onRunNow={handleRunNow}
                runPendingId={
                  dispatchMutation.isPending
                    ? (dispatchMutation.variables ?? null)
                    : null
                }
                onDelete={handleDeleteRequest}
                onExport={handleExport}
                onEdit={canEdit ? handleEditRequest : undefined}
                runSummaries={runSummaries}
              />
              <AutomationGroup
                title={t(I18nKey.AUTOMATIONS$INACTIVE)}
                count={inactive.length}
                automations={inactive}
                view={viewMode}
                onToggle={handleToggle}
                onRunNow={handleRunNow}
                runPendingId={
                  dispatchMutation.isPending
                    ? (dispatchMutation.variables ?? null)
                    : null
                }
                onDelete={handleDeleteRequest}
                onExport={handleExport}
                onEdit={canEdit ? handleEditRequest : undefined}
                runSummaries={runSummaries}
              />

              {hasMore && (
                <button
                  type="button"
                  onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
                  className="self-center rounded-lg border border-[var(--oh-border)] px-6 py-2 text-sm text-white hover:bg-surface-raised"
                >
                  {t(I18nKey.AUTOMATIONS$LOAD_MORE)}
                </button>
              )}
            </>
          )}
        </div>

        {/* Delete confirmation modal */}
        <DeleteConfirmationModal
          automationName={deleteTarget?.name ?? ""}
          isOpen={deleteTarget !== null}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />

        {/* Edit modal — local backends only */}
        {editTarget && (
          <EditAutomationModal
            automation={editTarget}
            isOpen={editTarget !== null}
            onClose={() => setEditTarget(null)}
          />
        )}

        <AddAutomationModal
          isOpen={isAddAutomationOpen}
          onClose={() => setIsAddAutomationOpen(false)}
        />

        <ImportAutomationModal
          isOpen={importSpec !== null}
          spec={importSpec}
          isImporting={importMutation.isPending}
          onClose={() => setImportSpec(null)}
          onImport={handleImportConfirm}
        />
      </div>
    </AutomationsPageLayout>
  );
}
