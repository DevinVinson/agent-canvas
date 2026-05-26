import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { GitControlBarWorktreeButton } from "#/components/features/chat/git-control-bar-worktree-button";
import { getWorktreeHandoffActive } from "#/stores/worktree-handoff-store";
import type { WorktreeStatus } from "#/utils/worktree-status";

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

const baseStatus: WorktreeStatus = {
  displayMode: "direct",
  workspacePath: "/workspace/project/demo",
  workingDir: "/workspace/project/demo",
  branch: "main",
  worktreeEnabled: false,
  isGitRepo: true,
};

function renderWorktreeButton(
  props: React.ComponentProps<typeof GitControlBarWorktreeButton>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GitControlBarWorktreeButton {...props} />
    </QueryClientProvider>,
  );
}

describe("GitControlBarWorktreeButton", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 200,
      width: 80,
      height: 28,
      top: 200,
      left: 100,
      right: 180,
      bottom: 228,
      toJSON: () => ({}),
    });
  });

  it("opens the menu with a handoff-to-worktree action in direct mode", async () => {
    const user = userEvent.setup();
    renderWorktreeButton({
        mode: "conversation",
        status: baseStatus,
        branch: "main",
        onHandoff: vi.fn(),
      });

    await user.click(screen.getByTestId("git-control-bar-worktree-button"));

    expect(screen.getByTestId("git-control-bar-worktree-menu")).toBeInTheDocument();
    expect(
      screen.getByTestId("worktree-handoff-to-worktree-action"),
    ).toBeInTheDocument();
  });

  it("opens the handoff modal from the dropdown action", async () => {
    const user = userEvent.setup();
    const onHandoff = vi.fn();
    renderWorktreeButton({
        mode: "conversation",
        conversationId: "conv-1",
        status: baseStatus,
        branch: "feature/demo",
        repository: "org/repo",
        gitProvider: "github",
        onHandoff,
      });

    await user.click(screen.getByTestId("git-control-bar-worktree-button"));
    await user.click(screen.getByTestId("worktree-handoff-to-worktree-action"));
    await user.click(screen.getByTestId("worktree-handoff-confirm"));

    expect(onHandoff).toHaveBeenCalled();
    expect(getWorktreeHandoffActive("conv-1")).toBe(true);
  });

  it("shows handoff to branch when already in worktree mode", async () => {
    const user = userEvent.setup();
    renderWorktreeButton({
        mode: "conversation",
        status: {
          ...baseStatus,
          displayMode: "worktree-pending",
          branch: "main",
          worktreeEnabled: true,
        },
        branch: "main",
        onHandoff: vi.fn(),
      });

    expect(screen.getByTestId("git-control-bar-worktree-button")).toHaveTextContent(
      "WORKTREE$BUTTON_WORKTREE",
    );

    await user.click(screen.getByTestId("git-control-bar-worktree-button"));

    expect(
      screen.getByTestId("worktree-handoff-to-local-action"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("worktree-handoff-to-worktree-action"),
    ).not.toBeInTheDocument();
  });

  it("shows start-mode options on the home launcher dropdown", async () => {
    const user = userEvent.setup();
    renderWorktreeButton({
        mode: "home",
        status: {
          ...baseStatus,
          displayMode: "direct",
        },
        branch: "main",
        onHandoff: vi.fn(),
      });

    await user.click(screen.getByTestId("git-control-bar-worktree-button"));

    expect(
      screen.getByTestId("worktree-start-direct-action"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("worktree-start-worktree-action"),
    ).toBeInTheDocument();
  });
});
