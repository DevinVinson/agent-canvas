import type { CSSProperties, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Check, Split } from "lucide-react";
import { WorktreeMainDirectoryIcon } from "#/components/features/chat/worktree-main-directory-icon";
import { ContextMenu } from "#/ui/context-menu";
import { ContextMenuListItem } from "#/components/features/context-menu/context-menu-list-item";
import { I18nKey } from "#/i18n/declaration";
import { useClickOutsideElement } from "#/hooks/use-click-outside-element";
import {
  setWorktreePreferenceEnabled,
  useWorktreePreferenceEnabled,
} from "#/stores/worktree-preference-store";
import type { WorktreeHandoffVariant } from "#/components/features/chat/worktree-handoff-modal";
import { isInWorktreeMode, type WorktreeStatus } from "#/utils/worktree-status";

interface GitControlBarWorktreeMenuProps {
  status: WorktreeStatus;
  mode: "conversation" | "home";
  onOpenHandoffModal: (variant: WorktreeHandoffVariant) => void;
  onClose: () => void;
  handoffDisabled?: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  portalStyle: CSSProperties;
}

export function GitControlBarWorktreeMenu({
  status,
  mode,
  onOpenHandoffModal,
  onClose,
  handoffDisabled,
  anchorRef,
  portalStyle,
}: GitControlBarWorktreeMenuProps) {
  const { t } = useTranslation("openhands");
  const ref = useClickOutsideElement<HTMLUListElement>(onClose, anchorRef);
  const worktreePreferenceEnabled = useWorktreePreferenceEnabled();

  const inWorktreeMode =
    mode === "conversation" && isInWorktreeMode(status.displayMode);

  const showHandoffToWorktree =
    mode === "conversation" && status.isGitRepo && !inWorktreeMode;

  const showHandoffToLocal = inWorktreeMode;

  const showStartModeOptions = mode === "home";

  if (!showHandoffToWorktree && !showHandoffToLocal && !showStartModeOptions) {
    return null;
  }

  return (
    <ContextMenu
      ref={ref}
      testId="git-control-bar-worktree-menu"
      theme="popover"
      position="none"
      spacing="none"
      style={portalStyle}
      className="min-w-[200px]"
    >
      {showStartModeOptions ? (
        <>
          <ContextMenuListItem
            testId="worktree-start-direct-action"
            onClick={() => {
              setWorktreePreferenceEnabled(false);
              onClose();
            }}
          >
            <span className="flex min-w-0 w-full items-center gap-2">
              <WorktreeMainDirectoryIcon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {t(I18nKey.WORKTREE$BUTTON_DIRECT)}
              </span>
              {!worktreePreferenceEnabled ? (
                <Check className="h-4 w-4 shrink-0" aria-hidden />
              ) : null}
            </span>
          </ContextMenuListItem>
          <ContextMenuListItem
            testId="worktree-start-worktree-action"
            onClick={() => {
              setWorktreePreferenceEnabled(true);
              onClose();
            }}
          >
            <span className="flex min-w-0 w-full items-center gap-2">
              <Split className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {t(I18nKey.WORKTREE$START_NEW_WORKTREE)}
              </span>
              {worktreePreferenceEnabled ? (
                <Check className="h-4 w-4 shrink-0" aria-hidden />
              ) : null}
            </span>
          </ContextMenuListItem>
        </>
      ) : null}

      {showHandoffToWorktree ? (
        <ContextMenuListItem
          testId="worktree-handoff-to-worktree-action"
          isDisabled={handoffDisabled}
          onClick={() => {
            onOpenHandoffModal("to-worktree");
            onClose();
          }}
        >
          <span className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t(I18nKey.WORKTREE$HANDOFF_TO_WORKTREE_ACTION)}</span>
          </span>
        </ContextMenuListItem>
      ) : null}

      {showHandoffToLocal ? (
        <ContextMenuListItem
          testId="worktree-handoff-to-local-action"
          isDisabled={handoffDisabled}
          onClick={() => {
            onOpenHandoffModal("to-local");
            onClose();
          }}
        >
          <span className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t(I18nKey.WORKTREE$HANDOFF_TO_LOCAL_ACTION)}</span>
          </span>
        </ContextMenuListItem>
      ) : null}
    </ContextMenu>
  );
}
