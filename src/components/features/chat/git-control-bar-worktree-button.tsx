import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Split } from "lucide-react";
import { WorktreeMainDirectoryIcon } from "#/components/features/chat/worktree-main-directory-icon";
import { ComboboxCaretInline } from "#/ui/combobox-caret";
import { I18nKey } from "#/i18n/declaration";
import { Provider } from "#/types/settings";
import { cn } from "#/utils/utils";
import {
  formControlBorderClassName,
  formControlSurfaceClassName,
  formControlTransitionClassName,
} from "#/utils/form-control-classes";
import { RUNTIME_GIT_PROBE_QUERY_KEY } from "#/hooks/query/use-runtime-git-probe";
import { setWorktreeHandoffActive } from "#/stores/worktree-handoff-store";
import {
  isInWorktreeMode,
  resolveConversationBranch,
  type WorktreeStatus,
} from "#/utils/worktree-status";
import { GitControlBarWorktreeMenu } from "./git-control-bar-worktree-menu";
import {
  WorktreeHandoffModal,
  type WorktreeHandoffVariant,
} from "./worktree-handoff-modal";

interface GitControlBarWorktreeButtonProps {
  status: WorktreeStatus;
  mode: "conversation" | "home";
  conversationId?: string;
  branch?: string | null;
  repository?: string | null;
  gitProvider?: Provider | null;
  defaultLocalBranch?: string | null;
  workspacePath?: string | null;
  onHandoff: (prompt: string) => void;
  disabled?: boolean;
  handoffDisabled?: boolean;
}

const MENU_GAP_PX = 8;

export function GitControlBarWorktreeButton({
  status,
  mode,
  conversationId,
  branch,
  repository,
  gitProvider,
  defaultLocalBranch,
  workspacePath,
  onHandoff,
  disabled,
  handoffDisabled,
}: GitControlBarWorktreeButtonProps) {
  const { t } = useTranslation("openhands");
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [handoffModal, setHandoffModal] =
    useState<WorktreeHandoffVariant | null>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!menuOpen || !buttonRef.current) {
      return undefined;
    }

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      setPortalStyle({
        position: "fixed",
        top: rect.top - MENU_GAP_PX,
        left: rect.left,
        transform: "translateY(-100%)",
        zIndex: 9999,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const buttonLabel = (() => {
    switch (status.displayMode) {
      case "worktree-active":
      case "worktree-pending":
        return mode === "home"
          ? t(I18nKey.WORKTREE$START_NEW_WORKTREE)
          : t(I18nKey.WORKTREE$BUTTON_WORKTREE);
      case "non-git":
        return t(I18nKey.WORKTREE$BUTTON_NON_GIT);
      default:
        return t(I18nKey.WORKTREE$BUTTON_DIRECT);
    }
  })();

  const conversationBranch = resolveConversationBranch(
    branch,
    defaultLocalBranch,
  );
  const showMuted = status.displayMode === "non-git";
  const WorktreeIcon = isInWorktreeMode(status.displayMode)
    ? Split
    : WorktreeMainDirectoryIcon;
  const isHomeMode = mode === "home";

  const handleHandoffConfirm = (prompt: string) => {
    if (conversationId && handoffModal) {
      setWorktreeHandoffActive(conversationId, handoffModal === "to-worktree");
      queryClient.invalidateQueries({
        queryKey: [RUNTIME_GIT_PROBE_QUERY_KEY],
      });
    }
    onHandoff(prompt);
  };

  const menu =
    menuOpen && !disabled && portalStyle ? (
      <GitControlBarWorktreeMenu
        status={status}
        mode={mode}
        onOpenHandoffModal={setHandoffModal}
        onClose={() => setMenuOpen(false)}
        handoffDisabled={handoffDisabled}
        anchorRef={buttonRef}
        portalStyle={portalStyle}
      />
    ) : null;

  return (
    <>
      <div className="relative flex-shrink-0">
        <button
          ref={buttonRef}
          type="button"
          data-testid="git-control-bar-worktree-button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          title={buttonLabel}
          className={cn(
            "group flex flex-row items-center gap-2 py-1 w-fit max-w-[220px] truncate relative text-white",
            isHomeMode
              ? "rounded-full px-2.5"
              : "justify-between rounded-[100px] pl-2.5 pr-2",
            isHomeMode
              ? cn(
                  formControlBorderClassName,
                  formControlSurfaceClassName,
                  formControlTransitionClassName,
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-surface-raised",
                )
              : cn(
                  "border border-[var(--oh-border)] bg-transparent",
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:border-[var(--oh-border-subtle)]",
                ),
            showMuted && !disabled && "opacity-80",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center text-white",
              isHomeMode ? "h-4 w-4" : "h-3 w-3",
            )}
          >
            <WorktreeIcon
              className={cn(isHomeMode ? "h-4 w-4" : "h-3 w-3")}
              strokeWidth={2}
              aria-hidden
            />
          </span>
          <span className="font-normal text-sm leading-5 truncate">
            {buttonLabel}
          </span>
          <ComboboxCaretInline isOpen={menuOpen} />
        </button>

        {typeof document !== "undefined" && menu
          ? createPortal(menu, document.body)
          : null}
      </div>

      <WorktreeHandoffModal
        isOpen={handoffModal !== null}
        variant={handoffModal ?? "to-worktree"}
        branch={conversationBranch}
        repository={repository}
        gitProvider={gitProvider}
        defaultLocalBranch={defaultLocalBranch}
        workspacePath={workspacePath ?? status.workspacePath}
        onClose={() => setHandoffModal(null)}
        onConfirm={handleHandoffConfirm}
        disabled={handoffDisabled}
      />
    </>
  );
}
