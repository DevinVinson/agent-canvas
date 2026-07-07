import { AutomationKindListPage } from "#/components/features/automations/automation-kind-list-page";
import { I18nKey } from "#/i18n/declaration";

export default function AutomationWorkflows() {
  return (
    <AutomationKindListPage
      kind="workflow"
      titleKey={I18nKey.AUTOMATIONS$WORKFLOWS_TITLE}
      subtitleKey={I18nKey.AUTOMATIONS$WORKFLOWS_SUBTITLE}
      createLabelKey={I18nKey.AUTOMATIONS$CREATE_WORKFLOW}
      emptyTitleKey={I18nKey.AUTOMATIONS$WORKFLOWS_EMPTY_TITLE}
      emptyDescriptionKey={I18nKey.AUTOMATIONS$WORKFLOWS_EMPTY_DESCRIPTION}
    />
  );
}
