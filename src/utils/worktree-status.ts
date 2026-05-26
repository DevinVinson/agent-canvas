import { OPENHANDS_WORKTREE_BRANCH_PREFIX } from "#/constants/worktree-keys";

export type WorktreeDisplayMode =
  | "non-git"
  | "direct"
  | "worktree-active"
  | "worktree-pending";

export interface WorktreeStatus {
  displayMode: WorktreeDisplayMode;
  workspacePath: string | null;
  workingDir: string | null;
  branch: string | null;
  worktreeEnabled: boolean;
  isGitRepo: boolean;
}

const normalizePath = (path: string): string =>
  path.replace(/\/+$/, "").replace(/\/+/g, "/");

export const isOpenHandsWorktreeBranch = (
  branch: string | null | undefined,
): boolean => !!branch && branch.startsWith(OPENHANDS_WORKTREE_BRANCH_PREFIX);

export const isInWorktreeMode = (displayMode: WorktreeDisplayMode): boolean =>
  displayMode === "worktree-active" || displayMode === "worktree-pending";

export const resolveConversationBranch = (
  branch?: string | null,
  defaultLocalBranch?: string | null,
): string => branch ?? defaultLocalBranch ?? "main";

/** Branch the user should land on locally — never an internal worktree branch. */
export const resolveHandoffTargetBranch = (
  conversationBranch: string,
  runtimeBranch?: string | null,
): string =>
  isOpenHandsWorktreeBranch(runtimeBranch)
    ? conversationBranch
    : (runtimeBranch ?? conversationBranch);

export const pathsDiffer = (
  left: string | null | undefined,
  right: string | null | undefined,
): boolean => {
  if (!left || !right) return false;
  return normalizePath(left) !== normalizePath(right);
};

interface ResolveWorktreeStatusInput {
  workspacePath: string | null;
  workingDir: string | null;
  branch: string | null;
  worktreeEnabled: boolean;
  isGitRepo: boolean;
}

export const resolveWorktreeStatus = ({
  workspacePath,
  workingDir,
  branch,
  worktreeEnabled,
  isGitRepo,
}: ResolveWorktreeStatusInput): WorktreeStatus => {
  const onWorktreeBranch = isOpenHandsWorktreeBranch(branch);
  const runtimeDiffersFromWorkspace = pathsDiffer(workspacePath, workingDir);
  const worktreeActive = onWorktreeBranch || runtimeDiffersFromWorkspace;

  let displayMode: WorktreeDisplayMode;
  if (!isGitRepo) {
    displayMode = "non-git";
  } else if (worktreeActive) {
    displayMode = "worktree-active";
  } else if (worktreeEnabled) {
    displayMode = "worktree-pending";
  } else {
    displayMode = "direct";
  }

  return {
    displayMode,
    workspacePath,
    workingDir,
    branch,
    worktreeEnabled,
    isGitRepo,
  };
};
