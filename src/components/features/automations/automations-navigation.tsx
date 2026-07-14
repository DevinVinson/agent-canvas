import { LayoutDashboard, Sparkles } from "lucide-react";
import { NavigationLink } from "#/components/shared/navigation-link";
import {
  SIDEBAR_ROW_INTERACTIVE_CLASS,
  sidebarNavRowClassName,
} from "#/components/features/sidebar/sidebar-layout";
import { cn } from "#/utils/utils";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

const NAV_ITEMS = [
  {
    to: "/automations",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/automations/templates",
    label: "Templates",
    icon: Sparkles,
  },
] as const;

function NavigationItems({ mobile = false }: { mobile?: boolean }) {
  return NAV_ITEMS.map(({ to, label, icon: Icon }) => (
    <NavigationLink
      key={to}
      to={to}
      end
      data-testid={`automations-navigation-${label.toLowerCase()}`}
      className={({ isActive }) =>
        cn(
          mobile
            ? "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors"
            : sidebarNavRowClassName(),
          isActive
            ? SIDEBAR_ROW_INTERACTIVE_CLASS.active
            : SIDEBAR_ROW_INTERACTIVE_CLASS.idle,
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </NavigationLink>
  ));
}

export function AutomationsNavigation() {
  const { t } = useTranslation("openhands");
  const automateLabel = t(I18nKey.SIDEBAR$AUTOMATIONS);

  return (
    <aside
      data-testid="automations-navbar-desktop"
      className="hidden md:flex md:w-[260px] md:shrink-0 md:flex-col md:gap-2 md:sticky md:top-8 md:self-start"
    >
      <span className="px-2 text-sm font-normal text-white">
        {automateLabel}
      </span>
      <nav className="flex flex-col gap-0.5 pt-0.5" aria-label={automateLabel}>
        <NavigationItems />
      </nav>
    </aside>
  );
}

export function AutomationsMobileNavigation() {
  const { t } = useTranslation("openhands");

  return (
    <nav
      data-testid="automations-navbar-mobile"
      className="flex gap-1 overflow-x-auto border-b border-[var(--oh-border)] pb-2 md:hidden"
      aria-label={t(I18nKey.SIDEBAR$AUTOMATIONS)}
    >
      <NavigationItems mobile />
    </nav>
  );
}
