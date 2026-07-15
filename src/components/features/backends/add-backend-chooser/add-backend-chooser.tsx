import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import type { BackendConnectionOptionsProps } from "../backend-form-modal";
import {
  ADD_BACKEND_OPTIONS,
  type AddBackendOptionId,
} from "./add-backend-options";
import { CloudBackendDetails } from "./cloud-backend-details";
import { LocalBackendDetails } from "./local-backend-details";
import { RemoteBackendDetails } from "./remote-backend-details";

export function AddBackendChooser({
  onConnected,
  testIdRoot = "add-backend",
}: BackendConnectionOptionsProps) {
  const { t } = useTranslation("openhands");
  const [selectedOption, setSelectedOption] =
    useState<AddBackendOptionId>("cloud");

  const selected = ADD_BACKEND_OPTIONS.find(
    (option) => option.id === selectedOption,
  );

  const renderDetails = () => {
    switch (selectedOption) {
      case "local":
        return (
          <LocalBackendDetails
            onConnected={onConnected}
            testIdRoot={testIdRoot}
          />
        );
      case "remote":
        return (
          <RemoteBackendDetails
            onConnected={onConnected}
            testIdRoot={testIdRoot}
          />
        );
      case "cloud":
      default:
        return (
          <CloudBackendDetails
            onConnected={onConnected}
            testIdRoot={testIdRoot}
          />
        );
    }
  };

  return (
    <div
      data-testid={`${testIdRoot}-connection-options`}
      className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm leading-relaxed text-[var(--oh-muted)]">
          {t(I18nKey.BACKEND$ADD_CHOOSER_DESC)}
        </p>
        <div
          role="tablist"
          aria-label={t(I18nKey.BACKEND$ADD_CHOOSER_TABLIST_LABEL)}
          className="flex flex-col gap-2"
        >
          {ADD_BACKEND_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = option.id === selectedOption;

            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-testid={`${testIdRoot}-option-${option.id}`}
                onClick={() => setSelectedOption(option.id)}
                className={cn(
                  "flex min-h-[76px] w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left",
                  "transition-colors duration-75 motion-reduce:transition-none",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-[var(--oh-border)] bg-base-primary hover:bg-surface-raised",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tertiary">
                  <Icon
                    className={cn(
                      "size-5",
                      isSelected ? "text-primary" : "text-[var(--oh-muted)]",
                    )}
                    aria-hidden
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-content-2">
                    {t(option.titleKey)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-[var(--oh-muted)]">
                    {t(option.descriptionKey)}
                  </span>
                </span>
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0",
                    isSelected ? "text-primary" : "text-[var(--oh-muted)]",
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        aria-label={selected ? t(selected.titleKey) : undefined}
        className="min-w-0 border-t border-[var(--oh-border)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
      >
        {renderDetails()}
      </div>
    </div>
  );
}
