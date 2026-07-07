import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { I18nKey } from "#/i18n/declaration";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";
import {
  useAutomations,
  useDeleteAutomation,
  useDispatchAutomation,
  useToggleAutomation,
} from "#/hooks/query/use-automations";
import { useAutomationHealth } from "#/hooks/query/use-automation-health";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { useTracking } from "#/hooks/use-tracking";
import type { Automation } from "#/types/automation";
import {
  filterAutomationsByKind,
  type AutomationKind,
} from "#/utils/automation-kind";
import { settingsLikeMainScrollClassName } from "#/utils/settings-like-page-layout-classes";
import { BrandButton } from "#/components/features/settings/brand-button";
import { AutomationCardSkeleton } from "./automation-card-skeleton";
import { AutomationGroup } from "./automation-group";
import { AutomationViewToggle } from "./automation-view-toggle";
import {
  readStoredAutomationViewMode,
  writeStoredAutomationViewMode,
  type AutomationViewMode,
} from "./automation-view-mode";
import { AddAutomationModal } from "./add-automation-modal";
import { AutomationsNavigation } from "./automations-navigation";
import { BackendNotConfigured } from "./backend-not-configured";
import { DeleteConfirmationModal } from "./delete-confirmation-modal";
import { EditAutomationModal } from "./detail/edit-automation-modal";
import { ErrorState } from "./error-state";
import { SearchInput } from "./search-input";

const PAGE_SIZE = 50;

interface AutomationKindListPageProps {
  kind: AutomationKind;
  titleKey: I18nKey;
  subtitleKey: I18nKey;
  createLabelKey: I18nKey;
  emptyTitleKey: I18nKey;
  emptyDescriptionKey: I18nKey;
}

function automationMatchesQuery(automation: Automation, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  return (
    automation.name.toLowerCase().includes(query) ||
    (automation.prompt ?? "").toLowerCase().includes(query) ||
    (automation.repository ?? "").toLowerCase().includes(query) ||
    (automation.model ?? "").toLowerCase().includes(query)
  );
}

function TypeEmptyState({
  title,
  description,
  actionLabel,
  onCreate,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onCreate: () => void;
}) {
  return (
    <div
      data-testid="automations-kind-empty"
      className="rounded-lg border border-[var(--oh-border)] bg-base-secondary px-6 py-10 text-center"
    >
      <h2 className="text-base font-semibold text-content">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">
        {description}
      </p>
      <BrandButton
        type="button"
        variant="secondary"
        className="mt-6"
        onClick={onCreate}
      >
        {actionLabel}
      </BrandButton>
    </div>
  );
}

export function AutomationKindListPage({
  kind,
  titleKey,
  subtitleKey,
  createLabelKey,
  emptyTitleKey,
  emptyDescriptionKey,
}: AutomationKindListPageProps) {
  const { t } = useTranslation("openhands");
  const title = t(titleKey);
  const subtitle = t(subtitleKey);
  const createLabel = t(createLabelKey);
  const emptyTitle = t(emptyTitleKey);
  const emptyDescription = t(emptyDescriptionKey);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<AutomationViewMode>(() =>
    readStoredAutomationViewMode(),
  );
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<Automation | null>(null);
  const [isAddAutomationOpen, setIsAddAutomationOpen] = useState(false);

  const active = useActiveBackend();
  const canEdit = active.backend.kind === "local";
  const { trackPrebuiltAutomationEnabled } = useTracking();
  const toggleMutation = useToggleAutomation();
  const deleteMutation = useDeleteAutomation();
  const dispatchMutation = useDispatchAutomation();

  const {
    data: healthData,
    isLoading: isHealthLoading,
    refetch: refetchHealth,
  } = useAutomationHealth();
  const isBackendHealthy = healthData?.status === "ok";
  const { data, isLoading, isError, refetch } = useAutomations({
    limit,
    offset: 0,
    enabled: isBackendHealthy,
  });

  const kindAutomations = useMemo(
    () =>
      data?.automations ? filterAutomationsByKind(data.automations, kind) : [],
    [data?.automations, kind],
  );

  const filtered = useMemo(
    () =>
      kindAutomations.filter((automation) =>
        automationMatchesQuery(automation, searchQuery),
      ),
    [kindAutomations, searchQuery],
  );

  const activeAutomations = useMemo(
    () => filtered.filter((automation) => automation.enabled),
    [filtered],
  );
  const inactiveAutomations = useMemo(
    () => filtered.filter((automation) => !automation.enabled),
    [filtered],
  );

  const handleToggle = (id: string, currentEnabled: boolean) => {
    const willEnable = !currentEnabled;
    toggleMutation.mutate({ id, enabled: willEnable });
    if (willEnable) {
      const automation = data?.automations.find((item) => item.id === id);
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
    const automation = data?.automations.find((item) => item.id === id);
    if (automation) {
      setDeleteTarget({ id, name: automation.name });
    }
  };

  const handleEditRequest = (id: string) => {
    const automation = data?.automations.find((item) => item.id === id);
    if (automation) {
      setEditTarget(automation);
    }
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

  const hasNoKindAutomations =
    !isLoading && !isError && kindAutomations.length === 0;
  const hasMore = data ? data.total > data.automations.length : false;

  if (isHealthLoading) {
    return (
      <div className="flex h-full gap-4 md:gap-6 md:pl-8 lg:gap-10 lg:pl-10">
        <AutomationsNavigation />
        <main className={settingsLikeMainScrollClassName}>
          <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-6">
            <h1 className="text-xl font-medium text-content">{title}</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
            <div className="mt-6 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <AutomationCardSkeleton key={`skeleton-${String(index)}`} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isBackendHealthy) {
    return (
      <div className="flex h-full gap-4 md:gap-6 md:pl-8 lg:gap-10 lg:pl-10">
        <AutomationsNavigation />
        <main className={settingsLikeMainScrollClassName}>
          <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-6">
            <h1 className="text-xl font-medium text-content">{title}</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
            <BackendNotConfigured onRetry={refetchHealth} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      data-testid={`automations-${kind}-screen`}
      className="flex h-full gap-4 md:gap-6 md:pl-8 lg:gap-10 lg:pl-10"
    >
      <AutomationsNavigation />
      <main className={settingsLikeMainScrollClassName}>
        <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-content">{title}</h1>
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            </div>
            <BrandButton
              type="button"
              variant="secondary"
              testId={`automations-create-${kind}`}
              className="shrink-0 whitespace-nowrap"
              onClick={() => setIsAddAutomationOpen(true)}
            >
              {createLabel}
            </BrandButton>
          </div>

          <div className="mt-6 flex items-stretch gap-2">
            <SearchInput value={searchQuery} onChange={setSearchQuery} />
            <AutomationViewToggle
              view={viewMode}
              onChange={handleViewModeChange}
              disabled={hasNoKindAutomations}
            />
          </div>

          <div className="mt-6 flex flex-col gap-6">
            {isLoading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <AutomationCardSkeleton key={`skeleton-${String(index)}`} />
                ))}
              </div>
            )}

            {isError && !isLoading && <ErrorState onRetry={refetch} />}

            {hasNoKindAutomations && (
              <TypeEmptyState
                title={emptyTitle}
                description={emptyDescription}
                actionLabel={createLabel}
                onCreate={() => setIsAddAutomationOpen(true)}
              />
            )}

            {!isLoading && !isError && kindAutomations.length > 0 && (
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
                  onEdit={canEdit ? handleEditRequest : undefined}
                />
                <AutomationGroup
                  title={t(I18nKey.AUTOMATIONS$INACTIVE)}
                  count={inactiveAutomations.length}
                  automations={inactiveAutomations}
                  view={viewMode}
                  onToggle={handleToggle}
                  onRunNow={handleRunNow}
                  runPendingId={
                    dispatchMutation.isPending
                      ? (dispatchMutation.variables ?? null)
                      : null
                  }
                  onDelete={handleDeleteRequest}
                  onEdit={canEdit ? handleEditRequest : undefined}
                />

                {filtered.length === 0 && (
                  <p className="rounded-lg border border-[var(--oh-border)] bg-base-secondary px-4 py-6 text-center text-sm text-muted">
                    {t(I18nKey.AUTOMATIONS$NO_KIND_SEARCH_RESULTS, {
                      title: title.toLowerCase(),
                    })}
                  </p>
                )}

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

          <DeleteConfirmationModal
            automationName={deleteTarget?.name ?? ""}
            isOpen={deleteTarget !== null}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />

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
        </div>
      </main>
    </div>
  );
}
