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
import { cn } from "#/utils/utils";
import { ComboboxCaretInline } from "#/ui/combobox-caret";

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
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<LocalWorkspace | null>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const workspaceOptions = useMemo(() => {
    const registered = workspacesResponse?.workspaces ?? [];
    if (registered.length > 0) return registered;

    if (workspacePath) {
      const name =
        workspacePath.replace(/\/+$/, "").split("/").pop() || workspacePath;
      return [
        {
          id: workspacePath,
          name,
          path: workspacePath,
        },
      ];
    }

    if (repository) {
      const name = repository.split("/").pop() || repository;
      return [
        {
          id: `repo:${repository}`,
          name,
          path: repository,
        },
      ];
    }

    return [];
  }, [repository, workspacePath, workspacesResponse?.workspaces]);

  useEffect(() => {
    if (!isOpen) return;

    const keepLocalBranch = defaultLocalBranch ?? branch;
    setLocalBranch(toBranch(keepLocalBranch));
    setTargetBranch(toBranch(branch));
    setSelectedWorkspace(workspaceOptions[0] ?? null);
    setWorkspaceMenuOpen(false);
  }, [
    branch,
    defaultLocalBranch,
    isOpen,
    workspaceOptions.length,
    workspaceOptions[0]?.id,
    workspaceOptions[0]?.path,
  ]);

  if (!isOpen) return null;

  const canUseBranchDropdown = !!repository && !!gitProvider;
  const canConfirm =
    variant === "to-worktree"
      ? !!localBranch?.name
      : !!targetBranch?.name && !!selectedWorkspace;

  const handleConfirm = () => {
    if (!canConfirm) return;

    const prompt =
      variant === "to-worktree"
        ? buildHandoffToWorktreePrompt(branch, localBranch!.name)
        : buildHandoffToLocalPrompt(
            targetBranch!.name,
            workspaceLabel(selectedWorkspace!),
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
        className="inline-flex min-w-[120px] max-w-[220px] align-middle"
      />
    ) : (
      <WorktreeBranchPill branch={targetBranch?.name ?? branch} />
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

        <div className="w-full text-sm leading-6 text-[var(--oh-muted)]">
          {descriptionLead} {descriptionBranchNode} {descriptionTrail}
        </div>

        {variant === "to-worktree" ? (
          <div className="flex w-full flex-wrap items-center gap-2 text-sm leading-6 text-[var(--oh-muted)]">
            <span>{t(I18nKey.WORKTREE$LOCAL_WORKSPACE_SWITCH_LABEL)}</span>
            {canUseBranchDropdown ? (
              <GitBranchDropdown
                repository={repository}
                provider={gitProvider}
                selectedBranch={localBranch}
                onBranchSelect={setLocalBranch}
                defaultBranch={defaultLocalBranch ?? branch}
                placeholder={t(I18nKey.COMMON$NO_BRANCH)}
                className="min-w-[120px] max-w-[220px]"
              />
            ) : (
              <WorktreeBranchPill branch={localBranch?.name ?? branch} />
            )}
          </div>
        ) : (
          <div className="flex w-full flex-wrap items-center gap-2 text-sm leading-6 text-[var(--oh-muted)]">
            <span>{t(I18nKey.WORKTREE$LOCAL_WORKSPACE_TARGET_LABEL)}</span>
            <div className="relative">
              <button
                type="button"
                data-testid="worktree-handoff-workspace-select"
                aria-haspopup="listbox"
                aria-expanded={workspaceMenuOpen}
                disabled={workspaceOptions.length === 0}
                onClick={() => setWorkspaceMenuOpen((open) => !open)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-[var(--oh-border)] bg-[var(--oh-surface)] px-2.5 py-1 text-sm leading-5 text-[var(--oh-foreground)]",
                  workspaceOptions.length === 0 &&
                    "opacity-50 cursor-not-allowed",
                )}
              >
                <span className="truncate max-w-[180px]">
                  {selectedWorkspace
                    ? workspaceLabel(selectedWorkspace)
                    : t(I18nKey.HOME$NO_WORKSPACE_OPTION)}
                </span>
                <ComboboxCaretInline isOpen={workspaceMenuOpen} />
              </button>
              {workspaceMenuOpen && workspaceOptions.length > 0 ? (
                <ul
                  className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-[var(--oh-border-subtle)] bg-tertiary py-1 shadow-lg"
                  role="listbox"
                >
                  {workspaceOptions.map((workspace) => (
                    <li key={workspace.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedWorkspace?.id === workspace.id}
                        className="w-full px-3 py-2 text-left text-sm text-[var(--oh-foreground)] hover:bg-[var(--oh-interactive-hover)]"
                        onClick={() => {
                          setSelectedWorkspace(workspace);
                          setWorkspaceMenuOpen(false);
                        }}
                      >
                        {workspaceLabel(workspace)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        )}

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
