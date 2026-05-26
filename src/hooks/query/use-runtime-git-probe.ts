import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";

import { getAgentServerWorkingDir } from "#/api/agent-server-config";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useRuntimeIsReady } from "#/hooks/use-runtime-is-ready";
import { useBashCommandRunner } from "#/hooks/use-bash-command-runner";

export interface RuntimeGitProbe {
  branch: string | null;
  gitTopLevel: string | null;
}

export const RUNTIME_GIT_PROBE_QUERY_KEY = "runtime-git-probe";

const EMPTY_RUNTIME_GIT_PROBE: RuntimeGitProbe = {
  branch: null,
  gitTopLevel: null,
};

/**
 * Live git probe for the active conversation workspace. Unlike
 * `useLocalGitInfo`, this stays enabled even when conversation metadata
 * already records a repository/branch so the worktree control can reflect
 * runtime branch changes (for example after handing off to a worktree).
 */
export const useRuntimeGitProbe = () => {
  const { data: conversation } = useActiveConversation();
  const runtimeIsReady = useRuntimeIsReady();

  const conversationId = conversation?.id;
  const conversationUrl = conversation?.conversation_url;
  const sessionApiKey = conversation?.session_api_key;
  const workingDir =
    conversation?.workspace?.working_dir?.trim() || getAgentServerWorkingDir();

  const queryEnabled = runtimeIsReady && !!conversationId;

  const runCommand = useBashCommandRunner(
    conversationUrl,
    sessionApiKey,
    queryEnabled,
  );

  const runCommandRef = useRef(runCommand);
  runCommandRef.current = runCommand;

  // runCommandRef is a ref (always stable); the linter cannot infer this so
  // we disable the exhaustive-deps check here.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  return useQuery<RuntimeGitProbe>({
    queryKey: [
      RUNTIME_GIT_PROBE_QUERY_KEY,
      conversationId,
      conversationUrl,
      sessionApiKey,
      workingDir,
    ],
    queryFn: async () => {
      const run = (command: string, cwd: string, timeout: number) =>
        runCommandRef.current(command, cwd, timeout);

      const [branchResult, topLevelResult] = await Promise.all([
        run("git rev-parse --abbrev-ref HEAD 2>/dev/null", workingDir, 10),
        run("git rev-parse --show-toplevel 2>/dev/null", workingDir, 10),
      ]);

      const rawBranch =
        branchResult.exit_code === 0 ? branchResult.stdout.trim() : "";
      const branch = rawBranch && rawBranch !== "HEAD" ? rawBranch : null;
      const gitTopLevel =
        topLevelResult.exit_code === 0
          ? topLevelResult.stdout.trim().replace(/\/+$/, "")
          : null;

      if (!branch && !gitTopLevel) return EMPTY_RUNTIME_GIT_PROBE;

      return { branch, gitTopLevel };
    },
    enabled: queryEnabled,
    retry: false,
    staleTime: 10_000,
    refetchInterval: 10_000,
    gcTime: 1000 * 60 * 5,
    meta: { disableToast: true },
  });
};
