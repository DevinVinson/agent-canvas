import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ModalBackdrop } from "#/components/shared/modals/modal-backdrop";
import { ModalBody } from "#/components/shared/modals/modal-body";
import { ModalCloseButton } from "#/components/shared/modals/modal-close-button";
import { BaseModalTitle } from "#/components/shared/modals/confirmation-modals/base-modal";
import { BrandButton } from "#/components/features/settings/brand-button";
import { GitBranchDropdown } from "#/components/features/home/git-branch-dropdown/git-branch-dropdown";
import { WorktreeBranchPill } from "#/components/features/chat/worktree-branch-pill";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { useLocalWorkspaces } from "#/hooks/query/use-local-workspaces";
import { I18nKey } from "#/i18n/declaration";
import { Branch } from "#/types/git";
import { Provider } from "#/types/settings";
import { LocalWorkspace } from "#/types/workspace";
import {
  buildHandoffToLocalPrompt,
  buildHandoffToWorktreePrompt,
} from "#/constants/worktree-keys";

export type WorktreeHandoffVariant = "to-worktree" | "to-local";

interface WorktreeHandoffModalProps {
  isOpen: boolean;
  variant: WorktreeHandoffVariant;
  /** Conversation / feature branch (never an internal worktree branch). */
  branch: string;
  repository?: string | null;
  gitProvider?: Provider | null;
  defaultLocalBranch?: string | null;
  workspacePath?: string | null;
  onClose: () => void;
  onConfirm: (prompt: string) => void;
  disabled?: boolean;
}

function workspaceLabel(workspace: LocalWorkspace): string {
  return workspace.name || workspace.path.split("/").pop() || workspace.path;
}

function toBranch(name: string): Branch {
  return { name, commit_sha: "", protected: false };
}

export function WorktreeHandoffModal({
  isOpen,
  variant,
  branch,
  repository,
  gitProvider,
  defaultLocalBranch,
  workspacePath,
  onClose,
  onConfirm,
  disabled = false,
}: WorktreeHandoffModalProps) {
  const { t } = useTranslation("openhands");
  const { backend } = useActiveBackend();
  const isLocalBackend = backend.kind === "local";
  const { data: workspacesResponse } = useLocalWorkspaces({
    enabled: isOpen && isLocalBackend,
  });

  const [localBranch, setLocalBranch] = useState<Branch | null>(null);
  const [targetBranch, setTargetBranch] = useState<Branch | null>(null);

  const targetWorkspace = useMemo((): LocalWorkspace | null => {
    const registered = workspacesResponse?.workspaces ?? [];
    if (registered.length > 0) return registered[0];

    if (workspacePath) {
      const name =
        workspacePath.replace(/\/+$/, "").split("/").pop() || workspacePath;
      return {
        id: workspacePath,
        name,
        path: workspacePath,
      };
    }

    if (repository) {
      const name = repository.split("/").pop() || repository;
      return {
        id: `repo:${repository}`,
        name,
        path: repository,
      };
    }

    return null;
  }, [repository, workspacePath, workspacesResponse?.workspaces]);

  useEffect(() => {
    if (!isOpen) return;

    const keepLocalBranch = defaultLocalBranch ?? branch;
    setLocalBranch(toBranch(keepLocalBranch));
    setTargetBranch(toBranch(branch));
  }, [branch, defaultLocalBranch, isOpen]);

  if (!isOpen) return null;

  const canUseBranchDropdown = !!repository && !!gitProvider;
  const canConfirm =
    variant === "to-worktree"
      ? !!localBranch?.name
      : !!targetBranch?.name && !!targetWorkspace;

  const handleConfirm = () => {
    if (!canConfirm) return;

    const prompt =
      variant === "to-worktree"
        ? buildHandoffToWorktreePrompt(branch, localBranch!.name)
        : buildHandoffToLocalPrompt(
            targetBranch!.name,
            workspaceLabel(targetWorkspace!),
          );

    onConfirm(prompt);
    onClose();
  };

  const title =
    variant === "to-worktree"
      ? t(I18nKey.WORKTREE$HANDOFF_TO_WORKTREE_TITLE)
      : t(I18nKey.WORKTREE$HANDOFF_TO_LOCAL_TITLE);

  const descriptionLead =
    variant === "to-worktree"
      ? t(I18nKey.WORKTREE$HANDOFF_TO_WORKTREE_LEAD)
      : t(I18nKey.WORKTREE$HANDOFF_TO_LOCAL_LEAD);

  const descriptionTrail =
    variant === "to-worktree"
      ? t(I18nKey.WORKTREE$HANDOFF_TO_WORKTREE_TRAIL)
      : t(I18nKey.WORKTREE$HANDOFF_TO_LOCAL_TRAIL);

  const descriptionBranchNode =
    variant === "to-worktree" ? (
      <WorktreeBranchPill branch={branch} />
    ) : canUseBranchDropdown ? (
      <GitBranchDropdown
        repository={repository}
        provider={gitProvider}
        selectedBranch={targetBranch}
        onBranchSelect={setTargetBranch}
        defaultBranch={branch}
        placeholder={t(I18nKey.COMMON$NO_BRANCH)}
        className="w-full"
      />
    ) : (
      <WorktreeBranchPill branch={targetBranch?.name ?? branch} />
    );

  const descriptionContent =
    variant === "to-local" && canUseBranchDropdown ? (
      <>
        <span>{descriptionLead}</span>
        {descriptionBranchNode}
        <span>{descriptionTrail}</span>
      </>
    ) : (
      <span>
        {descriptionLead} {descriptionBranchNode} {descriptionTrail}
      </span>
    );

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalBody
        testID="worktree-handoff-modal"
        width="sm"
        className="relative items-start border border-[var(--oh-border)] !gap-5"
      >
        <ModalCloseButton
          onClose={onClose}
          testId="close-worktree-handoff-modal"
        />

        <div className="flex w-full flex-col gap-4 pr-6">
          <div className="flex size-10 items-center justify-center rounded-xl border border-[var(--oh-border)] bg-[var(--oh-surface)] text-[var(--oh-foreground)]">
            <ArrowLeftRight className="size-4" aria-hidden />
          </div>
          <BaseModalTitle
            title={title}
            className="text-[var(--oh-foreground)] text-2xl leading-8 font-semibold"
          />
        </div>

        <div className="flex w-full flex-col gap-2 text-sm leading-6 text-[var(--oh-muted)]">
          {descriptionContent}
        </div>

        {variant === "to-worktree" ? (
          <div className="flex w-full flex-col gap-2 text-sm leading-6 text-[var(--oh-muted)]">
            <span>{t(I18nKey.WORKTREE$LOCAL_WORKSPACE_SWITCH_LABEL)}</span>
            {canUseBranchDropdown ? (
              <GitBranchDropdown
                repository={repository}
                provider={gitProvider}
                selectedBranch={localBranch}
                onBranchSelect={setLocalBranch}
                defaultBranch={defaultLocalBranch ?? branch}
                placeholder={t(I18nKey.COMMON$NO_BRANCH)}
                className="w-full"
              />
            ) : (
              <WorktreeBranchPill branch={localBranch?.name ?? branch} />
            )}
          </div>
        ) : null}

        <BrandButton
          type="button"
          variant="primary"
          className="w-full"
          isDisabled={disabled || !canConfirm}
          onClick={handleConfirm}
          testId="worktree-handoff-confirm"
        >
          {t(I18nKey.WORKTREE$HANDOFF_CONFIRM)}
        </BrandButton>
      </ModalBody>
    </ModalBackdrop>
  );
}
