import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import type { Automation } from "#/types/automation";
import { KebabMenu } from "./kebab-menu";
import { useHasPermission } from "#/hooks/use-has-permission";
import { useNavigation } from "#/context/navigation-context";
import PlayIcon from "#/icons/play.svg?react";
import ClockIcon from "#/icons/clock.svg?react";
import GlobeIcon from "#/icons/globe.svg?react";
import { StyledTooltip } from "#/components/shared/buttons/styled-tooltip";
import { SkillCardPillRow } from "#/components/features/skills/skill-card-pill-row";
import { cn } from "#/utils/utils";
import { automationIconActionButtonClassName } from "./automation-action-button-classes";
import { buildAutomationMetadataPills } from "./build-automation-pills";
import { buildAutomationMenuItems } from "./build-automation-menu-items";
import {
  automationListRowClassName,
  automationListCellClassName,
} from "./automation-view-mode";
import type { AutomationRunSummary } from "#/hooks/query/use-automation-run-summaries";
import {
  AutomationHealthBadge,
  formatCompactDuration,
  formatLastRun,
  getAutomationHealth,
} from "./automation-health";

const ROW_COPY = {
  lastRun: "Last run",
  runs: "runs",
  average: "avg.",
} as const;

interface AutomationListRowProps {
  automation: Automation;
  onToggle: (id: string, enabled: boolean) => void;
  onRunNow: (id: string) => void;
  isRunPending?: boolean;
  onDelete: (id: string) => void;
  onExport: (automation: Automation) => void;
  onEdit?: (id: string) => void;
  runSummary?: AutomationRunSummary;
}

export function AutomationListRow({
  automation,
  onToggle,
  onRunNow,
  isRunPending = false,
  onDelete,
  onExport,
  onEdit,
  runSummary,
}: AutomationListRowProps) {
  const { navigate } = useNavigation();
  const { t } = useTranslation("openhands");
  const canManage = useHasPermission("manage_automations");

  const scheduleLabel =
    automation.trigger.schedule_human || automation.trigger.type;
  const pills = useMemo(
    () => buildAutomationMetadataPills(automation, scheduleLabel),
    [automation, scheduleLabel],
  );

  const handleView = () => {
    navigate?.(`/automations/${automation.id}`);
  };

  const menuItems = buildAutomationMenuItems({
    automation,
    t,
    canManage,
    onRunNow,
    isRunPending,
    onView: handleView,
    onExport,
    onEdit,
    onToggle,
    onDelete,
  });
  const health = getAutomationHealth(automation, runSummary);
  const lastRunAt =
    runSummary?.latestRun?.started_at ?? automation.last_triggered_at;

  const handleRowClick = () => {
    handleView();
  };

  return (
    <tr
      data-testid={`automation-list-row-${automation.id}`}
      onClick={handleRowClick}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          handleRowClick();
        }
      }}
      tabIndex={0}
      className={cn(automationListRowClassName, "cursor-pointer")}
    >
      <td className={automationListCellClassName}>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {automation.trigger.type === "event" ? (
              <GlobeIcon className="size-4 shrink-0 text-muted" />
            ) : (
              <ClockIcon className="size-4 shrink-0 text-muted" />
            )}
            <span
              className="max-w-[40%] shrink-0 truncate text-sm font-medium text-white"
              title={automation.name}
            >
              {automation.name}
            </span>
            {pills.length > 0 ? (
              <div className="min-w-0 flex-1">
                <SkillCardPillRow
                  pills={pills}
                  testId={`automation-pills-${automation.id}`}
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:hidden">
            <AutomationHealthBadge health={health} />
            <span className="text-xs text-tertiary-alt">
              {ROW_COPY.lastRun} {formatLastRun(lastRunAt)}
            </span>
          </div>
        </div>
      </td>

      <td
        className={cn(
          "hidden whitespace-nowrap md:table-cell",
          automationListCellClassName,
        )}
      >
        <AutomationHealthBadge health={health} />
      </td>
      <td
        className={cn(
          "hidden whitespace-nowrap text-xs text-tertiary-light md:table-cell",
          automationListCellClassName,
        )}
      >
        {formatLastRun(lastRunAt)}
      </td>
      <td
        className={cn(
          "hidden whitespace-nowrap text-right text-xs text-tertiary-light lg:table-cell",
          automationListCellClassName,
        )}
      >
        {runSummary?.isLoading
          ? "…"
          : (runSummary?.total ?? 0).toLocaleString()}{" "}
        {ROW_COPY.runs}
        <span className="ml-3 text-tertiary-alt">
          {formatCompactDuration(runSummary?.averageDurationMs ?? null)}{" "}
          {ROW_COPY.average}
        </span>
      </td>

      <td className={cn("w-0 whitespace-nowrap", automationListCellClassName)}>
        <div className="flex items-center justify-end gap-0.5">
          {canManage ? (
            <StyledTooltip
              content={t(I18nKey.AUTOMATIONS$RUN_NOW)}
              placement="top"
            >
              <button
                type="button"
                data-testid={`automation-run-now-${automation.id}`}
                aria-label={t(I18nKey.AUTOMATIONS$RUN_NOW)}
                aria-busy={isRunPending}
                disabled={isRunPending || !automation.enabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onRunNow(automation.id);
                }}
                className={automationIconActionButtonClassName}
              >
                <PlayIcon className="size-4 shrink-0" aria-hidden />
              </button>
            </StyledTooltip>
          ) : null}
          <KebabMenu items={menuItems} />
        </div>
      </td>
    </tr>
  );
}
