import { useState } from "react";
import { RecommendedAutomationsLauncher } from "#/components/features/automations/recommended-automations-launcher";
import { SearchInput } from "#/components/features/automations/search-input";
import { AutomationsPageLayout } from "#/components/features/automations/automations-page-layout";

const TEMPLATE_COPY = {
  title: "Templates",
  description:
    "Browse proven automations and beta ideas, then launch one into a conversation to tailor it to your work.",
} as const;

export default function AutomationTemplates() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <AutomationsPageLayout>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">
          {TEMPLATE_COPY.title}
        </h1>
        <p className="max-w-2xl text-sm text-tertiary-light">
          {TEMPLATE_COPY.description}
        </p>
      </header>

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        className="max-w-xl flex-none"
      />

      <RecommendedAutomationsLauncher query={searchQuery} />
    </AutomationsPageLayout>
  );
}
