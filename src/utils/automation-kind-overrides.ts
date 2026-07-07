import type { Automation, AutomationKind } from "#/types/automation";

const STORAGE_KEY = "openhands-automation-kind-overrides";

type OverrideMap = Record<string, AutomationKind>;

function isAutomationKind(value: unknown): value is AutomationKind {
  return value === "workflow" || value === "routine" || value === "responder";
}

function makeOverrideKey(
  backendId: string,
  orgId: string | null | undefined,
  automationId: string,
): string {
  return `${backendId}:${orgId ?? ""}:${automationId}`;
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readOverrides(): OverrideMap {
  if (!canUseLocalStorage()) return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, AutomationKind] =>
          isAutomationKind(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

function writeOverrides(overrides: OverrideMap): void {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getAutomationKindOverride({
  backendId,
  orgId,
  automationId,
}: {
  backendId: string;
  orgId?: string | null;
  automationId: string;
}): AutomationKind | undefined {
  return readOverrides()[makeOverrideKey(backendId, orgId, automationId)];
}

export function setAutomationKindOverride({
  backendId,
  orgId,
  automationId,
  kind,
}: {
  backendId: string;
  orgId?: string | null;
  automationId: string;
  kind: AutomationKind;
}): void {
  writeOverrides({
    ...readOverrides(),
    [makeOverrideKey(backendId, orgId, automationId)]: kind,
  });
}

export function applyAutomationKindOverride(
  automation: Automation,
  backendId: string,
  orgId?: string | null,
): Automation {
  const kind = getAutomationKindOverride({
    backendId,
    orgId,
    automationId: automation.id,
  });
  return kind ? { ...automation, kind } : automation;
}

export function applyAutomationKindOverrides(
  automations: Automation[],
  backendId: string,
  orgId?: string | null,
): Automation[] {
  return automations.map((automation) =>
    applyAutomationKindOverride(automation, backendId, orgId),
  );
}
