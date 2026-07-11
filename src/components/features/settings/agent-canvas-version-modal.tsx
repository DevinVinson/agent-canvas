import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Star,
} from "lucide-react";
import { ModalBackdrop } from "#/components/shared/modals/modal-backdrop";
import { ModalCloseButton } from "#/components/shared/modals/modal-close-button";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";

const NPM_UPDATE_COMMAND = "npm install -g @openhands/agent-canvas@latest";
const DOCKER_UPDATE_COMMAND =
  "docker pull ghcr.io/openhands/agent-canvas:latest";
const RELEASE_NOTES_URL = "https://github.com/OpenHands/agent-canvas/releases";
const DOCUMENTATION_URL =
  "https://docs.openhands.dev/openhands/usage/agent-canvas/backends";
const GITHUB_REPO_URL = "https://github.com/OpenHands/agent-canvas";
const GITHUB_ISSUE_URL =
  "https://github.com/OpenHands/agent-canvas/issues/new/choose";

type UpdateCommandTab = "npm" | "docker";

const UPDATE_COMMAND_TABS: UpdateCommandTab[] = ["npm", "docker"];

interface AgentCanvasVersionModalProps {
  installedVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  isChecking: boolean;
  onCheckForUpdates: () => void;
  onClose: () => void;
}

function ExternalTextLink({
  href,
  children,
}: React.PropsWithChildren<{ href: string }>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-[var(--oh-text)]"
    >
      {children}
      <ExternalLink className="size-4 shrink-0" aria-hidden />
    </a>
  );
}

function getUpdateCommandTabLabelKey(tab: UpdateCommandTab): I18nKey {
  return tab === "npm"
    ? I18nKey.SETTINGS$VERSION_NPM_RECOMMENDED
    : I18nKey.SETTINGS$VERSION_DOCKER;
}

export function AgentCanvasVersionModal({
  installedVersion,
  latestVersion,
  updateAvailable,
  isChecking,
  onCheckForUpdates,
  onClose,
}: AgentCanvasVersionModalProps) {
  const { t } = useTranslation("openhands");
  const [selectedTab, setSelectedTab] = React.useState<UpdateCommandTab>("npm");
  const command =
    selectedTab === "npm" ? NPM_UPDATE_COMMAND : DOCKER_UPDATE_COMMAND;

  const copyCommand = React.useCallback(() => {
    void navigator.clipboard?.writeText(command);
  }, [command]);

  return (
    <ModalBackdrop
      onClose={onClose}
      aria-label={t(I18nKey.SETTINGS$VERSION_MODAL_ARIA_LABEL)}
    >
      <section className="relative flex w-[520px] max-w-[90vw] flex-col gap-5 rounded-xl border border-[var(--oh-border)] bg-base-secondary p-6 shadow-xl">
        <ModalCloseButton
          onClose={onClose}
          testId="agent-canvas-version-modal-close"
        />

        <header className="flex items-center gap-3 pr-8">
          {updateAvailable ? (
            <ArrowUpCircle
              className="size-7 shrink-0 text-[#3B82F6]"
              aria-hidden
            />
          ) : (
            <CheckCircle2
              className="size-7 shrink-0 text-[var(--oh-status-success)]"
              aria-hidden
            />
          )}
          <h2 className="text-base font-semibold leading-6 text-white">
            {t(
              updateAvailable
                ? I18nKey.SETTINGS$VERSION_UPDATE_AVAILABLE
                : I18nKey.SETTINGS$VERSION_UP_TO_DATE_TITLE,
            )}
          </h2>
        </header>

        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-white">
            {t(I18nKey.SETTINGS$VERSION_PRODUCT_NAME)}
          </h3>
          <p className="text-sm text-[var(--oh-text)]">
            {t(I18nKey.SETTINGS$VERSION_INSTALLED, {
              version: installedVersion,
            })}
          </p>
          {updateAvailable && latestVersion ? (
            <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--oh-text)]">
              {t(I18nKey.SETTINGS$VERSION_LATEST, {
                version: latestVersion,
              })}
              <span className="rounded-full bg-[#351F1B] px-2 py-0.5 text-xs font-semibold text-[#FF7A5C]">
                {t(I18nKey.SETTINGS$VERSION_UPDATE_AVAILABLE)}
              </span>
            </p>
          ) : (
            <p
              className={cn(
                "text-sm",
                latestVersion
                  ? "text-[var(--oh-status-success)]"
                  : "text-[var(--oh-muted)]",
              )}
            >
              {t(
                latestVersion
                  ? I18nKey.SETTINGS$VERSION_LATEST_MESSAGE
                  : I18nKey.SETTINGS$VERSION_CHECK_UNAVAILABLE,
              )}
            </p>
          )}
        </div>

        {updateAvailable ? (
          <div className="border-t border-[var(--oh-border)] pt-4">
            <h3 className="text-sm font-semibold text-white">
              {t(I18nKey.SETTINGS$VERSION_HOW_TO_UPDATE)}
            </h3>
            <div className="mt-3 flex border-b border-[var(--oh-border)]">
              {UPDATE_COMMAND_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={cn(
                    "px-3 pb-2 text-sm font-medium",
                    selectedTab === tab
                      ? "border-b border-white text-white"
                      : "text-[var(--oh-muted)] hover:text-white",
                  )}
                >
                  {t(getUpdateCommandTabLabelKey(tab))}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-md border border-[var(--oh-border)] bg-[var(--oh-surface-deep)] px-4 py-3">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-sm text-white">
                {command}
              </code>
              <button
                type="button"
                onClick={copyCommand}
                aria-label={t(I18nKey.SETTINGS$VERSION_COPY_COMMAND)}
                className="shrink-0 text-[var(--oh-muted)] hover:text-white"
              >
                <Copy className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <ExternalTextLink href={DOCUMENTATION_URL}>
            {t(I18nKey.SETTINGS$VERSION_DOCUMENTATION)}
          </ExternalTextLink>
          <ExternalTextLink href={RELEASE_NOTES_URL}>
            {t(I18nKey.SETTINGS$VERSION_RELEASE_NOTES)}
          </ExternalTextLink>
          {!updateAvailable ? (
            <button
              type="button"
              onClick={onCheckForUpdates}
              className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-[var(--oh-text)] disabled:cursor-wait disabled:text-[var(--oh-muted)]"
              disabled={isChecking}
            >
              {t(I18nKey.SETTINGS$VERSION_CHECK_FOR_UPDATES)}
              <RefreshCw
                className={cn("size-4 shrink-0", isChecking && "animate-spin")}
                aria-hidden
              />
            </button>
          ) : null}
        </div>

        <footer className="border-t border-[var(--oh-border)] pt-4">
          <h3 className="text-sm font-semibold text-white">
            {t(I18nKey.SETTINGS$VERSION_HELP_IMPROVE)}
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--oh-interactive-hover)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--oh-surface-raised)]"
            >
              <Star
                className="size-4 fill-[#FACC15] text-[#FACC15]"
                aria-hidden
              />
              {t(I18nKey.SETTINGS$VERSION_STAR_ON_GITHUB)}
            </a>
            <a
              href={GITHUB_ISSUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--oh-interactive-hover)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--oh-surface-raised)]"
            >
              <MessageCircle className="size-4" aria-hidden />
              {t(I18nKey.SETTINGS$VERSION_FILE_ISSUE)}
            </a>
          </div>
        </footer>
      </section>
    </ModalBackdrop>
  );
}
