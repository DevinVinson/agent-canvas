import { AutomationKindListPage } from "#/components/features/automations/automation-kind-list-page";
import { I18nKey } from "#/i18n/declaration";

export default function AutomationRoutines() {
  return (
    <AutomationKindListPage
      kind="routine"
      titleKey={I18nKey.AUTOMATIONS$ROUTINES_TITLE}
      subtitleKey={I18nKey.AUTOMATIONS$ROUTINES_SUBTITLE}
      createLabelKey={I18nKey.AUTOMATIONS$CREATE_ROUTINE}
      emptyTitleKey={I18nKey.AUTOMATIONS$ROUTINES_EMPTY_TITLE}
      emptyDescriptionKey={I18nKey.AUTOMATIONS$ROUTINES_EMPTY_DESCRIPTION}
    />
  );
}
