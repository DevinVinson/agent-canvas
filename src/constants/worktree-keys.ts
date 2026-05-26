export const WORKTREE_PREFERENCE_STORAGE_KEY =
  "openhands-worktree-preference-enabled";

export const WORKTREE_HANDOFF_STORAGE_KEY =
  "openhands-worktree-handoff-by-conversation";

export const OPENHANDS_WORKTREE_BRANCH_PREFIX = "openhands/";

export function buildHandoffToWorktreePrompt(
  worktreeBranch: string,
  localBranch: string,
): string {
  return (
    `Please create a git worktree for branch "${worktreeBranch}" so this conversation can continue in isolation. ` +
    `Keep my local workspace checked out on branch "${localBranch}".`
  );
}

export function buildHandoffToLocalPrompt(
  branch: string,
  workspaceLabel: string,
): string {
  return (
    `Please hand off the changes from this worktree: check out branch "${branch}" in my local workspace "${workspaceLabel}" ` +
    "and detach or remove the worktree so I can continue working locally in my IDE."
  );
}
