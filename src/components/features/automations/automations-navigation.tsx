import type { ReactElement } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavigationLink } from "#/components/shared/navigation-link";
import { useNavigation } from "#/context/navigation-context";
import {
  SIDEBAR_ROW_INTERACTIVE_CLASS,
  sidebarNavRowClassName,
} from "#/components/features/sidebar/sidebar-layout";
import { I18nKey } from "#/i18n/declaration";
import AutomationsIcon from "#/icons/automations.svg?react";
import { cn } from "#/utils/utils";

interface AutomationNavItem {
  to: string;
  label: string;
  icon: ReactElement;
  end?: boolean;
}

export const AUTOMATIONS_NAV_ITEMS: AutomationNavItem[] = [
  {
    to: "/automations",
    label: "Automations",
    icon: <AutomationsIcon width={16} height={16} aria-hidden="true" />,
    end: true,
  },
  {
    to: "/automations/presets",
    label: "Presets",
    icon: <Sparkles width={16} height={16} aria-hidden="true" />,
    end: true,
  },
];

export function AutomationsNavigation() {
  const { t } = useTranslation("openhands");
  const { currentPath } = useNavigation();

  return (
    <aside
      data-testid="automations-navbar-desktop"
      className="hidden md:flex md:w-[260px] md:shrink-0 md:flex-col md:gap-2 md:sticky md:top-8 md:self-start"
    >
      <span className="px-2 text-sm font-normal text-white">
        {t(I18nKey.SIDEBAR$AUTOMATIONS)}
      </span>
      <div className="flex flex-col gap-0.5 pt-0.5">
        {AUTOMATIONS_NAV_ITEMS.map((item) => (
          <NavigationLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-testid={`sidebar-automations-${item.to}`}
            className={({ isActive }) =>
              cn(sidebarNavRowClassName(), "truncate", {
                [SIDEBAR_ROW_INTERACTIVE_CLASS.active]:
                  isActive ||
                  (item.to === "/automations" &&
                    currentPath.startsWith("/automations/") &&
                    currentPath !== "/automations/presets"),
                [SIDEBAR_ROW_INTERACTIVE_CLASS.idle]:
                  !isActive &&
                  !(
                    item.to === "/automations" &&
                    currentPath.startsWith("/automations/") &&
                    currentPath !== "/automations/presets"
                  ),
              })
            }
          >
            <span className="shrink-0 flex items-center justify-center">
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
          </NavigationLink>
        ))}
      </div>
    </aside>
  );
}
