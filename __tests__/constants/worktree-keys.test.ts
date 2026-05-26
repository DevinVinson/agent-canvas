import { describe, expect, it } from "vitest";
import {
  buildHandoffToLocalPrompt,
  buildHandoffToWorktreePrompt,
} from "#/constants/worktree-keys";

describe("worktree handoff prompts", () => {
  it("builds a worktree handoff prompt", () => {
    expect(buildHandoffToWorktreePrompt("feature/demo", "main")).toContain(
      'branch "feature/demo"',
    );
    expect(buildHandoffToWorktreePrompt("feature/demo", "main")).toContain(
      'branch "main"',
    );
  });

  it("builds a local handoff prompt", () => {
    expect(buildHandoffToLocalPrompt("feature/demo", "agent-canvas")).toContain(
      'branch "feature/demo"',
    );
    expect(buildHandoffToLocalPrompt("feature/demo", "agent-canvas")).toContain(
      'workspace "agent-canvas"',
    );
  });
});
