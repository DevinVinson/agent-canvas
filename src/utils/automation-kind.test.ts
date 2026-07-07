import { describe, expect, it } from "vitest";
import type { Automation } from "#/types/automation";
import { classifyAutomation, filterAutomationsByKind } from "./automation-kind";

function automation(
  overrides: Partial<Automation> & Pick<Automation, "trigger">,
): Automation {
  return {
    id: "automation-id",
    name: "Automation",
    enabled: true,
    created_at: "2026-07-07T00:00:00.000Z",
    updated_at: "2026-07-07T00:00:00.000Z",
    prompt: null,
    ...overrides,
  };
}

describe("classifyAutomation", () => {
  it("classifies scheduled automations as routines", () => {
    const result = classifyAutomation(
      automation({
        trigger: {
          type: "cron",
          schedule: "0 9 * * 1-5",
          schedule_human: "Weekdays at 09:00",
        },
      }),
    );

    expect(result).toBe("routine");
  });

  it("classifies event automations as workflows", () => {
    const result = classifyAutomation(
      automation({
        trigger: {
          type: "event",
          source: "github",
          on: "pull_request.opened",
        },
      }),
    );

    expect(result).toBe("workflow");
  });

  it("classifies known chat-like responder automations as responders", () => {
    const result = classifyAutomation(
      automation({
        name: "Slack Channel Responder",
        trigger: {
          type: "event",
          source: "slack",
          on: "app_mention",
        },
        plugins: ["Slack"],
        notification: "Slack responder",
      }),
    );

    expect(result).toBe("responder");
  });
});

describe("filterAutomationsByKind", () => {
  it("returns only automations that match the requested kind", () => {
    const routine = automation({
      id: "routine",
      trigger: { type: "cron", schedule: "0 9 * * *" },
    });
    const workflow = automation({
      id: "workflow",
      trigger: { type: "event", source: "github", on: "push" },
    });

    expect(filterAutomationsByKind([routine, workflow], "workflow")).toEqual([
      workflow,
    ]);
  });
});
