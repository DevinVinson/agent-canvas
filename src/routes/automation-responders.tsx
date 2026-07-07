import { AutomationKindListPage } from "#/components/features/automations/automation-kind-list-page";
import { I18nKey } from "#/i18n/declaration";

export default function AutomationResponders() {
  return (
    <AutomationKindListPage
      kind="responder"
      titleKey={I18nKey.AUTOMATIONS$RESPONDERS_TITLE}
      subtitleKey={I18nKey.AUTOMATIONS$RESPONDERS_SUBTITLE}
      createLabelKey={I18nKey.AUTOMATIONS$CREATE_RESPONDER}
      emptyTitleKey={I18nKey.AUTOMATIONS$RESPONDERS_EMPTY_TITLE}
      emptyDescriptionKey={I18nKey.AUTOMATIONS$RESPONDERS_EMPTY_DESCRIPTION}
    />
  );
}
