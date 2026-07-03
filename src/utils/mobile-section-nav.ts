import { I18nKey } from "#/i18n/declaration";

const SETTINGS_PREFIX = "/settings";
const CUSTOMIZE_HUB = "/customize";
const EXTENSIONS_DETAIL_PATHS = ["/skills", "/mcp", "/plugins"] as const;
const AUTOMATE_HUB = "/automate";
const AUTOMATIONS_PREFIX = "/automations";

export type MobileTopBarMode = "menu" | "back";

export interface MobileTopBarState {
  mode: MobileTopBarMode;
  backTo?: string;
  backLabelKey?: I18nKey;
}

export function getMobileTopBarState(pathname: string): MobileTopBarState {
  if (pathname === SETTINGS_PREFIX) {
    return { mode: "menu" };
  }

  if (
    pathname.startsWith(`${SETTINGS_PREFIX}/`) &&
    pathname.length > SETTINGS_PREFIX.length
  ) {
    return {
      mode: "back",
      backTo: SETTINGS_PREFIX,
      backLabelKey: I18nKey.SETTINGS$TITLE,
    };
  }

  if (pathname === CUSTOMIZE_HUB) {
    return { mode: "menu" };
  }

  if (
    EXTENSIONS_DETAIL_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return {
      mode: "back",
      backTo: CUSTOMIZE_HUB,
      backLabelKey: I18nKey.NAV$CUSTOMIZE,
    };
  }

  if (pathname === AUTOMATE_HUB) {
    return { mode: "menu" };
  }

  if (
    pathname === AUTOMATIONS_PREFIX ||
    pathname.startsWith(`${AUTOMATIONS_PREFIX}/`)
  ) {
    return {
      mode: "back",
      backTo: AUTOMATE_HUB,
      backLabelKey: I18nKey.SIDEBAR$AUTOMATIONS,
    };
  }

  return { mode: "menu" };
}

export function isExtensionsSectionPath(pathname: string): boolean {
  return (
    pathname === CUSTOMIZE_HUB ||
    EXTENSIONS_DETAIL_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  );
}

export function isAutomationsSectionPath(pathname: string): boolean {
  return (
    pathname === AUTOMATE_HUB ||
    pathname === AUTOMATIONS_PREFIX ||
    pathname.startsWith(`${AUTOMATIONS_PREFIX}/`)
  );
}
