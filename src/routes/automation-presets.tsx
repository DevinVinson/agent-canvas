import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AutomationsNavigation } from "#/components/features/automations/automations-navigation";
import { RecommendedAutomationsLauncher } from "#/components/features/automations/recommended-automations-launcher";
import { SearchInput } from "#/components/features/automations/search-input";
import { I18nKey } from "#/i18n/declaration";
import { settingsLikeMainScrollClassName } from "#/utils/settings-like-page-layout-classes";

export default function AutomationPresets() {
  const { t } = useTranslation("openhands");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div
      data-testid="automation-presets-screen"
      className="flex h-full gap-4 md:gap-6 md:pl-8 lg:gap-10 lg:pl-10"
    >
      <AutomationsNavigation />
      <main className={settingsLikeMainScrollClassName}>
        <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-6">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold leading-6 text-foreground">
              {t(I18nKey.RECOMMENDED_AUTOMATIONS$SECTION_TITLE)}
            </h1>
            <p className="max-w-2xl text-sm text-tertiary-light">
              {t(I18nKey.RECOMMENDED_AUTOMATIONS$SECTION_DESCRIPTION)}
            </p>
          </div>

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            className="flex-none"
          />

          <RecommendedAutomationsLauncher query={searchQuery} />
        </div>
      </main>
    </div>
  );
}
