import type { ReactNode } from "react";
import { cn } from "#/utils/utils";
import { settingsLikeMainScrollClassName } from "#/utils/settings-like-page-layout-classes";
import {
  AutomationsMobileNavigation,
  AutomationsNavigation,
} from "./automations-navigation";

export function AutomationsPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full gap-4 md:gap-6 md:pl-8 lg:gap-10 lg:pl-10">
      <AutomationsNavigation />
      <main className={cn(settingsLikeMainScrollClassName, "h-full")}>
        <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-6">
          <AutomationsMobileNavigation />
          {children}
        </div>
      </main>
    </div>
  );
}
