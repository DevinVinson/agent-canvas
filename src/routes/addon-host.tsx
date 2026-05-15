import React from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { I18nKey } from "#/i18n/declaration";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { useNavigation } from "#/context/navigation-context";
import { createAddonApi } from "#/addons/sdk";
import { AddonErrorBoundary } from "#/addons/addon-error-boundary";
import { getAddonById } from "#/addons/registry";
import type {
  AddonApi,
  AddonPageProps,
  AddonRegistryEntry,
} from "#/addons/types";

interface AddonStatusPanelProps {
  title: string;
  message: string;
  detail?: string;
  tone?: "neutral" | "danger";
}

function AddonStatusPanel({
  title,
  message,
  detail,
  tone = "neutral",
}: AddonStatusPanelProps) {
  return (
    <main className="flex h-full items-center justify-center px-6 py-10">
      <section
        role={tone === "danger" ? "alert" : undefined}
        className="w-full max-w-xl rounded-lg border border-tertiary bg-base-secondary p-6"
      >
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-tertiary-light">{message}</p>
        {detail ? (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-tertiary p-3 text-xs text-red-100">
            {detail}
          </pre>
        ) : null}
      </section>
    </main>
  );
}

type AddonLoadState =
  | { status: "loading" }
  | { status: "ready"; Component: React.ComponentType<AddonPageProps> }
  | { status: "error"; error: Error };

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function AddonLoadingState() {
  const { t } = useTranslation("openhands");

  return (
    <div
      aria-label={t(I18nKey.ADDONS$LOADING)}
      className="flex h-full items-center justify-center"
    >
      <LoadingSpinner size="large" />
    </div>
  );
}

function LoadedAddonRoute({ entry }: { entry: AddonRegistryEntry }) {
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const [loadState, setLoadState] = React.useState<AddonLoadState>({
    status: "loading",
  });

  const addonNavigate = React.useCallback<AddonApi["navigate"]>(
    (to, options) => navigate(to, options),
    [navigate],
  );

  const api = React.useMemo(
    () =>
      createAddonApi({
        entry,
        navigate: addonNavigate,
        queryClient,
      }),
    [addonNavigate, entry, queryClient],
  );

  React.useEffect(() => {
    let cancelled = false;

    setLoadState({ status: "loading" });

    async function loadAddon() {
      if (!entry.hasRoute || !entry.load) {
        throw new Error("This add-on does not register an add-on page.");
      }

      const addonModule = await entry.load();

      if (typeof addonModule.default !== "function") {
        throw new Error(
          "Add-on entry must export a default register function.",
        );
      }

      const registration = await addonModule.default(api);

      if (
        !registration ||
        typeof registration !== "object" ||
        typeof registration.Component !== "function"
      ) {
        throw new Error("Add-on register function must return a Component.");
      }

      if (!cancelled) {
        setLoadState({
          status: "ready",
          Component: registration.Component,
        });
      }
    }

    loadAddon().catch((error: unknown) => {
      if (!cancelled) {
        setLoadState({ status: "error", error: toError(error) });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [api, entry]);

  if (loadState.status === "error") {
    throw loadState.error;
  }

  if (loadState.status === "loading") {
    return <AddonLoadingState />;
  }

  const RegisteredAddonComponent = loadState.Component;

  return (
    <RegisteredAddonComponent
      api={api}
      manifest={entry.manifest}
      basePath={api.basePath}
    />
  );
}

export default function AddonHostRoute() {
  const { t } = useTranslation("openhands");
  const params = useParams();
  const addonId = params.addonId;
  const entry = getAddonById(addonId);

  if (!entry) {
    return (
      <AddonStatusPanel
        title={t(I18nKey.ADDONS$NOT_FOUND_TITLE)}
        message={t(I18nKey.ADDONS$NOT_FOUND_MESSAGE, {
          addonId: addonId ?? "",
        })}
      />
    );
  }

  if (!entry.hasRoute) {
    return (
      <AddonStatusPanel
        title={entry.manifest.title}
        message="This add-on customizes the Agent Canvas app shell and does not register an add-on page."
      />
    );
  }

  return (
    <AddonErrorBoundary
      resetKey={entry.id}
      onError={(error, errorInfo) => {
        console.error(`[addons] ${entry.id} failed`, error, errorInfo);
      }}
      fallback={(error) => (
        <AddonStatusPanel
          tone="danger"
          title={t(I18nKey.ADDONS$ERROR_TITLE)}
          message={t(I18nKey.ADDONS$ERROR_MESSAGE, {
            addonTitle: entry.manifest.title,
          })}
          detail={error.message}
        />
      )}
    >
      <LoadedAddonRoute entry={entry} />
    </AddonErrorBoundary>
  );
}
