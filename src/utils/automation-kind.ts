import type { Automation, AutomationKind } from "#/types/automation";

export type { AutomationKind };

const SCHEDULE_TRIGGER_TYPES = new Set(["cron", "schedule"]);
const RESPONDER_SOURCES = new Set(["slack", "teams"]);
const RESPONDER_TEXT_MATCH =
  /\b(responder|respond|mention|monitor|chatbot|slackbot)\b/i;
const AUTOMATION_KINDS = new Set<AutomationKind>([
  "workflow",
  "routine",
  "responder",
]);

function isAutomationKind(value: unknown): value is AutomationKind {
  return (
    typeof value === "string" && AUTOMATION_KINDS.has(value as AutomationKind)
  );
}

function isResponderSource(value: string): boolean {
  const normalized = value.toLowerCase();
  return [...RESPONDER_SOURCES].some(
    (source) =>
      normalized === source || new RegExp(`\\b${source}\\b`, "i").test(value),
  );
}

function hasResponderSource(automation: Automation): boolean {
  const source = automation.trigger.source;
  if (source && isResponderSource(source)) {
    return true;
  }

  const plugins = automation.plugins ?? [];
  return plugins.length > 0 && plugins.every(isResponderSource);
}

function hasResponderText(automation: Automation): boolean {
  return [
    automation.name,
    automation.prompt ?? "",
    automation.notification ?? "",
    ...(automation.plugins ?? []),
  ].some((value) => RESPONDER_TEXT_MATCH.test(value));
}

export function classifyAutomation(automation: Automation): AutomationKind {
  if (isAutomationKind(automation.kind)) {
    return automation.kind;
  }

  const triggerType = automation.trigger.type.toLowerCase();

  if (hasResponderSource(automation) && hasResponderText(automation)) {
    return "responder";
  }

  if (
    SCHEDULE_TRIGGER_TYPES.has(triggerType) ||
    Boolean(automation.trigger.schedule) ||
    Boolean(automation.trigger.schedule_human)
  ) {
    return "routine";
  }

  return "workflow";
}

export function filterAutomationsByKind(
  automations: Automation[],
  kind: AutomationKind,
): Automation[] {
  return automations.filter(
    (automation) => classifyAutomation(automation) === kind,
  );
}
