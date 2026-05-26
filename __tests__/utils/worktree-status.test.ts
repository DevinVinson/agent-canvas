import { describe, expect, it } from "vitest";
import {
  isInWorktreeMode,
  isOpenHandsWorktreeBranch,
  pathsDiffer,
  resolveHandoffTargetBranch,
  resolveWorktreeStatus,
} from "#/utils/worktree-status";

describe("worktree-status", () => {
  it("detects openhands worktree branches", () => {
    expect(isOpenHandsWorktreeBranch("openhands/abc123")).toBe(true);
    expect(isOpenHandsWorktreeBranch("main")).toBe(false);
  });

  it("treats pending and active worktree modes as in-worktree", () => {
    expect(isInWorktreeMode("worktree-active")).toBe(true);
    expect(isInWorktreeMode("worktree-pending")).toBe(true);
    expect(isInWorktreeMode("direct")).toBe(false);
  });

  it("resolves handoff target branch away from internal worktree branches", () => {
    expect(
      resolveHandoffTargetBranch("main", "openhands/conversation-id"),
    ).toBe("main");
    expect(resolveHandoffTargetBranch("main", "feature/demo")).toBe(
      "feature/demo",
    );
  });

  it("detects active worktree from branch name", () => {
    const status = resolveWorktreeStatus({
      workspacePath: "/workspace/project/agent-canvas",
      workingDir: "/tmp/conversation-worktrees/id/agent-canvas",
      branch: "openhands/conversation-id",
      worktreeEnabled: true,
      isGitRepo: true,
    });

    expect(status.displayMode).toBe("worktree-active");
  });

  it("detects active worktree after a handoff is confirmed", () => {
    const status = resolveWorktreeStatus({
      workspacePath: "/workspace/project/puter",
      workingDir: "/workspace/project/puter",
      branch: "main",
      worktreeEnabled: false,
      isGitRepo: true,
      handoffActive: true,
    });

    expect(status.displayMode).toBe("worktree-active");
  });

  it("detects active worktree from a linked git worktree checkout", () => {
    const status = resolveWorktreeStatus({
      workspacePath: "/workspace/project/puter",
      workingDir: "/workspace/worktrees/puter-main",
      branch: null,
      worktreeEnabled: false,
      isGitRepo: true,
      isLinkedWorktree: true,
    });

    expect(status.displayMode).toBe("worktree-active");
  });

  it("detects direct workspace mode when worktree is disabled", () => {
    const status = resolveWorktreeStatus({
      workspacePath: "/workspace/project/agent-canvas",
      workingDir: "/workspace/project/agent-canvas",
      branch: "main",
      worktreeEnabled: false,
      isGitRepo: true,
    });

    expect(status.displayMode).toBe("direct");
  });

  it("marks non-git workspaces as unavailable for worktrees", () => {
    const status = resolveWorktreeStatus({
      workspacePath: "/workspace/project/notes",
      workingDir: "/workspace/project/notes",
      branch: null,
      worktreeEnabled: true,
      isGitRepo: false,
    });

    expect(status.displayMode).toBe("non-git");
  });

  it("normalizes trailing slashes when comparing paths", () => {
    expect(
      pathsDiffer("/workspace/project/", "/workspace/project"),
    ).toBe(false);
    expect(
      pathsDiffer("/workspace/project/a", "/workspace/project/b"),
    ).toBe(true);
  });
});
