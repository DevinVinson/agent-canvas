import { useMemo } from "react";
import { getStoredConversationMetadata } from "#/api/conversation-metadata-store";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useLocalGitInfo } from "#/hooks/query/use-local-git-info";
import { useRuntimeGitProbe } from "#/hooks/query/use-runtime-git-probe";
import { useWorktreePreferenceEnabled } from "#/stores/worktree-preference-store";
import {
  resolveWorktreeStatus,
  type WorktreeStatus,
} from "#/utils/worktree-status";

interface UseWorktreeStatusOptions {
  /** Home-page preview before a conversation exists. */
  previewMode?: boolean;
  previewWorkspacePath?: string | null;
  previewWorktreeEnabled?: boolean;
  previewIsGitRepo?: boolean;
}

export const useWorktreeStatus = (
  options: UseWorktreeStatusOptions = {},
): WorktreeStatus => {
  const { data: conversation } = useActiveConversation();
  const { data: localGitInfo } = useLocalGitInfo();
  const { data: runtimeGitProbe } = useRuntimeGitProbe();
  const worktreePreferenceEnabled = useWorktreePreferenceEnabled();

  return useMemo(() => {
    if (options.previewMode) {
      return resolveWorktreeStatus({
        workspacePath: options.previewWorkspacePath ?? null,
        workingDir: null,
        branch: null,
        worktreeEnabled:
          options.previewWorktreeEnabled ?? worktreePreferenceEnabled,
        isGitRepo: options.previewIsGitRepo ?? true,
      });
    }

    const storedMetadata = conversation?.id
      ? getStoredConversationMetadata(conversation.id)
      : null;
    const workspacePath = storedMetadata?.selected_workspace ?? null;
    const workingDir =
      runtimeGitProbe?.gitTopLevel ??
      conversation?.workspace?.working_dir ??
      null;
    const branch =
      runtimeGitProbe?.branch ??
      conversation?.selected_branch ??
      localGitInfo?.branch ??
      null;
    const isGitRepo =
      !!branch ||
      !!localGitInfo?.branch ||
      !!localGitInfo?.repository ||
      !!conversation?.selected_repository;

    return resolveWorktreeStatus({
      workspacePath,
      workingDir,
      branch,
      worktreeEnabled:
        storedMetadata?.worktree_enabled ?? worktreePreferenceEnabled,
      isGitRepo,
    });
  }, [
    conversation?.id,
    conversation?.selected_branch,
    conversation?.selected_repository,
    conversation?.workspace?.working_dir,
    localGitInfo?.branch,
    localGitInfo?.repository,
    options.previewIsGitRepo,
    options.previewMode,
    options.previewWorktreeEnabled,
    options.previewWorkspacePath,
    runtimeGitProbe?.branch,
    runtimeGitProbe?.gitTopLevel,
    worktreePreferenceEnabled,
  ]);
};
