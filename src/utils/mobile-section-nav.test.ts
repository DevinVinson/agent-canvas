import { describe, expect, it } from "vitest";
import { I18nKey } from "#/i18n/declaration";
import {
  getMobileTopBarState,
  isExtensionsSectionPath,
} from "./mobile-section-nav";

describe("getMobileTopBarState", () => {
  it("shows the menu on the Automate mobile hub", () => {
    expect(getMobileTopBarState("/automate")).toEqual({ mode: "menu" });
  });

  it("shows a back button to Automate on automation section child routes", () => {
    expect(getMobileTopBarState("/automations")).toEqual({
      mode: "back",
      backTo: "/automate",
      backLabelKey: I18nKey.SIDEBAR$AUTOMATIONS,
    });

    expect(getMobileTopBarState("/automations/presets")).toEqual({
      mode: "back",
      backTo: "/automate",
      backLabelKey: I18nKey.SIDEBAR$AUTOMATIONS,
    });

    expect(getMobileTopBarState("/automations/example-id")).toEqual({
      mode: "back",
      backTo: "/automate",
      backLabelKey: I18nKey.SIDEBAR$AUTOMATIONS,
    });
  });
});

describe("isExtensionsSectionPath", () => {
  it("does not classify Automate routes as Customize routes", () => {
    expect(isExtensionsSectionPath("/automate")).toBe(false);
    expect(isExtensionsSectionPath("/automations")).toBe(false);
    expect(isExtensionsSectionPath("/automations/presets")).toBe(false);
  });
});
