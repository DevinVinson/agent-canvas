import type { Automation } from "#/types/automation";

export type AutomationKind = "workflow" | "routine" | "responder";

const SCHEDULE_TRIGGER_TYPES = new Set(["cron", "schedule"]);
const RESPONDER_SOURCES = new Set(["slack", "teams"]);
const RESPONDER_TEXT_MATCH =
  /\b(responder|respond|mention|chatbot|slackbot)\b/i;

function hasResponderText(automation: Automation): boolean {
  return [
    automation.name,
    automation.prompt ?? "",
    automation.notification ?? "",
    ...(automation.plugins ?? []),
  ].some((value) => RESPONDER_TEXT_MATCH.test(value));
}

export function classifyAutomation(automation: Automation): AutomationKind {
  const triggerType = automation.trigger.type.toLowerCase();
  const source = automation.trigger.source?.toLowerCase();

  if (
    triggerType === "event" &&
    source &&
    RESPONDER_SOURCES.has(source) &&
    hasResponderText(automation)
  ) {
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
