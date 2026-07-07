import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAutomationHealth } from "#/hooks/query/use-automation-health";
import { useAutomations } from "#/hooks/query/use-automations";
import { useNavigation } from "#/context/navigation-context";
import { AutomationsNavigation } from "#/components/features/automations/automations-navigation";
import { AutomationCardSkeleton } from "#/components/features/automations/automation-card-skeleton";
import { BackendNotConfigured } from "#/components/features/automations/backend-not-configured";
import { ErrorState } from "#/components/features/automations/error-state";
import { AddAutomationModal } from "#/components/features/automations/add-automation-modal";
import { BrandButton } from "#/components/features/settings/brand-button";
import { I18nKey } from "#/i18n/declaration";
import { settingsLikeMainScrollClassName } from "#/utils/settings-like-page-layout-classes";
import {
  classifyAutomation,
  type AutomationKind,
} from "#/utils/automation-kind";
import { formatTimeDelta } from "#/utils/format-time-delta";
import type { Automation } from "#/types/automation";

const PAGE_SIZE = 50;

const KIND_CARDS: {
  kind: AutomationKind;
  titleKey: I18nKey;
  descriptionKey: I18nKey;
  href: string;
  actionKey: I18nKey;
}[] = [
  {
    kind: "workflow",
    titleKey: I18nKey.AUTOMATIONS$WORKFLOWS_TITLE,
    descriptionKey: I18nKey.AUTOMATIONS$WORKFLOWS_SUBTITLE,
    href: "/automations/workflows",
    actionKey: I18nKey.AUTOMATIONS$CREATE_WORKFLOW,
  },
  {
    kind: "routine",
    titleKey: I18nKey.AUTOMATIONS$ROUTINES_TITLE,
    descriptionKey: I18nKey.AUTOMATIONS$ROUTINES_SUBTITLE,
    href: "/automations/routines",
    actionKey: I18nKey.AUTOMATIONS$CREATE_ROUTINE,
  },
  {
    kind: "responder",
    titleKey: I18nKey.AUTOMATIONS$RESPONDERS_TITLE,
    descriptionKey: I18nKey.AUTOMATIONS$RESPONDERS_SUBTITLE,
    href: "/automations/responders",
    actionKey: I18nKey.AUTOMATIONS$CREATE_RESPONDER,
  },
];

function countByKind(automations: Automation[]) {
  return automations.reduce<Record<AutomationKind, number>>(
    (counts, automation) => {
      const kind = classifyAutomation(automation);
      return { ...counts, [kind]: counts[kind] + 1 };
    },
    { workflow: 0, routine: 0, responder: 0 },
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--oh-border)] bg-base-secondary p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-content">{value}</p>
    </div>
  );
}

function DashboardEmptyState({
  onCreate,
  onBrowseTemplates,
}: {
  onCreate: () => void;
  onBrowseTemplates: () => void;
}) {
  const { t } = useTranslation("openhands");

  return (
    <div
      data-testid="automations-dashboard-empty"
      className="rounded-lg border border-[var(--oh-border)] bg-base-secondary px-6 py-10 text-center"
    >
      <h2 className="text-base font-semibold text-content">
        {t(I18nKey.AUTOMATIONS$DASHBOARD_EMPTY_TITLE)}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">
        {t(I18nKey.AUTOMATIONS$DASHBOARD_EMPTY_DESCRIPTION)}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <BrandButton type="button" variant="secondary" onClick={onCreate}>
          {t(I18nKey.AUTOMATIONS$CREATE_AUTOMATION)}
        </BrandButton>
        <BrandButton
          type="button"
          variant="secondary"
          onClick={onBrowseTemplates}
        >
          {t(I18nKey.AUTOMATIONS$BROWSE_TEMPLATES)}
        </BrandButton>
      </div>
    </div>
  );
}

export default function AutomationsDashboard() {
  const { t } = useTranslation("openhands");
  const { navigate } = useNavigation();
  const [isAddAutomationOpen, setIsAddAutomationOpen] = useState(false);
  const {
    data: healthData,
    isLoading: isHealthLoading,
    refetch: refetchHealth,
  } = useAutomationHealth();
  const isBackendHealthy = healthData?.status === "ok";
  const { data, isLoading, isError, refetch } = useAutomations({
    limit: PAGE_SIZE,
    offset: 0,
    enabled: isBackendHealthy,
  });

  const automations = data?.automations ?? [];
  const activeCount = automations.filter(
    (automation) => automation.enabled,
  ).length;
  const kindCounts = useMemo(() => countByKind(automations), [automations]);
  const recentAutomations = useMemo(
    () =>
      automations
        .filter((automation) => automation.last_triggered_at)
        .slice()
        .sort((a, b) =>
          String(b.last_triggered_at).localeCompare(
            String(a.last_triggered_at),
          ),
        )
        .slice(0, 5),
    [automations],
  );

  if (isHealthLoading) {
    return (
      <div className="flex h-full gap-4 md:gap-6 md:pl-8 lg:gap-10 lg:pl-10">
        <AutomationsNavigation />
        <main className={settingsLikeMainScrollClassName}>
          <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-6">
            <h1 className="text-xl font-medium text-content">
              {t(I18nKey.AUTOMATIONS$DASHBOARD_TITLE)}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t(I18nKey.AUTOMATIONS$DASHBOARD_LOADING_SUBTITLE)}
            </p>
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
            <h1 className="text-xl font-medium text-content">
              {t(I18nKey.AUTOMATIONS$DASHBOARD_TITLE)}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t(I18nKey.AUTOMATIONS$DASHBOARD_LOADING_SUBTITLE)}
            </p>
            <BackendNotConfigured onRetry={refetchHealth} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      data-testid="automations-dashboard-screen"
      className="flex h-full gap-4 md:gap-6 md:pl-8 lg:gap-10 lg:pl-10"
    >
      <AutomationsNavigation />
      <main className={settingsLikeMainScrollClassName}>
        <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-content">
                {t(I18nKey.AUTOMATIONS$DASHBOARD_TITLE)}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {t(I18nKey.AUTOMATIONS$DASHBOARD_SUBTITLE)}
              </p>
            </div>
            <BrandButton
              type="button"
              variant="secondary"
              testId="automations-dashboard-create"
              className="shrink-0 whitespace-nowrap"
              onClick={() => setIsAddAutomationOpen(true)}
            >
              {t(I18nKey.AUTOMATIONS$CREATE_AUTOMATION)}
            </BrandButton>
          </div>

          {isLoading && (
            <div className="mt-6 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <AutomationCardSkeleton key={`skeleton-${String(index)}`} />
              ))}
            </div>
          )}

          {isError && !isLoading && <ErrorState onRetry={refetch} />}

          {!isLoading && !isError && automations.length === 0 && (
            <DashboardEmptyState
              onCreate={() => setIsAddAutomationOpen(true)}
              onBrowseTemplates={() => navigate?.("/automations/templates")}
            />
          )}

          {!isLoading && !isError && automations.length > 0 && (
            <>
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label={t(I18nKey.AUTOMATIONS$TOTAL_AUTOMATIONS)}
                  value={automations.length}
                />
                <StatCard
                  label={t(I18nKey.AUTOMATIONS$ACTIVE)}
                  value={activeCount}
                />
                <StatCard
                  label={t(I18nKey.AUTOMATIONS$ROUTINES_TITLE)}
                  value={kindCounts.routine}
                />
                <StatCard
                  label={t(I18nKey.AUTOMATIONS$RESPONDERS_TITLE)}
                  value={kindCounts.responder}
                />
              </section>

              <section className="grid gap-3 md:grid-cols-3">
                {KIND_CARDS.map((card) => {
                  const cardTitle = t(card.titleKey);
                  const cardDescription = t(card.descriptionKey);
                  const cardAction = t(card.actionKey);

                  return (
                    <div
                      key={card.kind}
                      className="rounded-lg border border-[var(--oh-border)] bg-base-secondary p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-semibold text-content">
                            {cardTitle}
                          </h2>
                          <p className="mt-1 text-xs leading-relaxed text-muted">
                            {cardDescription}
                          </p>
                        </div>
                        <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs text-tertiary-light">
                          {kindCounts[card.kind]}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <BrandButton
                          type="button"
                          variant="secondary"
                          onClick={() => navigate?.(card.href)}
                        >
                          {t(I18nKey.AUTOMATIONS$VIEW)}
                        </BrandButton>
                        <BrandButton
                          type="button"
                          variant="secondary"
                          onClick={() => setIsAddAutomationOpen(true)}
                        >
                          {cardAction}
                        </BrandButton>
                      </div>
                    </div>
                  );
                })}
              </section>

              <section className="rounded-lg border border-[var(--oh-border)] bg-base-secondary p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-content">
                      {t(I18nKey.AUTOMATIONS$RECENT_ACTIVITY)}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {t(I18nKey.AUTOMATIONS$RUNS_DETAIL_HINT)}
                    </p>
                  </div>
                  <BrandButton
                    type="button"
                    variant="secondary"
                    onClick={() => navigate?.("/automations/templates")}
                  >
                    {t(I18nKey.AUTOMATIONS$BROWSE_TEMPLATES)}
                  </BrandButton>
                </div>
                <div className="mt-4 flex flex-col divide-y divide-[var(--oh-border)]">
                  {recentAutomations.length > 0 ? (
                    recentAutomations.map((automation) => (
                      <button
                        key={automation.id}
                        type="button"
                        className="flex items-center justify-between gap-3 py-3 text-left hover:text-white"
                        onClick={() =>
                          navigate?.(`/automations/${automation.id}`)
                        }
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-content">
                            {automation.name}
                          </span>
                          <span className="block text-xs capitalize text-muted">
                            {classifyAutomation(automation)}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-tertiary-light">
                          {automation.last_triggered_at
                            ? t(I18nKey.AUTOMATIONS$TIME_AGO, {
                                time: formatTimeDelta(
                                  automation.last_triggered_at,
                                ),
                              })
                            : t(I18nKey.AUTOMATIONS$NEVER)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="py-6 text-sm text-muted">
                      {t(I18nKey.AUTOMATIONS$NO_RECENT_RUNS)}
                    </p>
                  )}
                </div>
              </section>
            </>
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
