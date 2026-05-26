import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { WorktreeHandoffModal } from "#/components/features/chat/worktree-handoff-modal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/contexts/active-backend-context", () => ({
  useActiveBackend: () => ({
    backend: { kind: "local", id: "local", host: "http://localhost" },
    orgId: null,
  }),
}));

vi.mock("#/hooks/query/use-local-workspaces", () => ({
  useLocalWorkspaces: () => ({ data: { workspaces: [] } }),
}));

vi.mock("#/components/features/home/git-branch-dropdown/git-branch-dropdown", () => ({
  GitBranchDropdown: () => <div data-testid="git-branch-dropdown-stub" />,
}));

describe("WorktreeHandoffModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("describes worktree handoff with the feature branch and local keep branch", () => {
    render(
      <WorktreeHandoffModal
        isOpen
        variant="to-worktree"
        branch="feature/demo"
        defaultLocalBranch="main"
        workspacePath="/workspace/project/demo"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("WORKTREE$HANDOFF_TO_WORKTREE_TITLE")).toBeInTheDocument();
    expect(screen.getByTitle("feature/demo")).toBeInTheDocument();
    expect(screen.getByTestId("worktree-handoff-confirm")).not.toBeDisabled();
  });

  it("uses branch-focused copy and enables confirm for repo-only handoff", () => {
    const onConfirm = vi.fn();
    render(
      <WorktreeHandoffModal
        isOpen
        variant="to-local"
        branch="main"
        repository="org/repo"
        gitProvider="github"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("WORKTREE$HANDOFF_TO_LOCAL_TITLE")).toBeInTheDocument();
    expect(screen.getByText(/WORKTREE\$HANDOFF_TO_LOCAL_TRAIL/)).toBeInTheDocument();
    expect(screen.getByTestId("git-branch-dropdown-stub")).toBeInTheDocument();
    expect(
      screen.queryByTestId("worktree-handoff-workspace-select"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("worktree-handoff-confirm")).not.toBeDisabled();
  });

  it("sends a branch handoff prompt with the selected target branch", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <WorktreeHandoffModal
        isOpen
        variant="to-local"
        branch="main"
        workspacePath="/workspace/project/agent-canvas"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByTestId("worktree-handoff-confirm"));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.stringContaining('branch "main"'),
    );
    expect(onConfirm).toHaveBeenCalledWith(
      expect.stringContaining('workspace "agent-canvas"'),
    );
  });

  it("keeps confirm disabled when no workspace or repository fallback exists", () => {
    render(
      <WorktreeHandoffModal
        isOpen
        variant="to-local"
        branch="main"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByTestId("worktree-handoff-confirm")).toBeDisabled();
  });
});
