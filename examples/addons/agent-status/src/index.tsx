import React from "react";
import type { AddonApi, AddonPageProps, AddonRegistration } from "#/addons";

interface ServerInfo {
  version?: string;
}

function AgentStatusPage({ api }: AddonPageProps) {
  const [serverInfo, setServerInfo] = React.useState<ServerInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    api
      .fetchJSON<ServerInfo>("/server_info")
      .then((data) => {
        if (!cancelled) {
          setServerInfo(data);
        }
      })
      .catch((requestError: Error) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <main className="mx-auto flex h-full max-w-3xl flex-col gap-4 px-6 py-10 text-foreground">
      <header>
        <p className="text-sm text-tertiary-light">{api.manifest.name}</p>
        <h1 className="text-2xl font-semibold">{api.manifest.title}</h1>
      </header>
      <section className="rounded-lg border border-tertiary bg-base-secondary p-4">
        <h2 className="text-base font-medium">Connected backend</h2>
        <p className="mt-2 text-sm text-tertiary-light">
          {error
            ? `Request failed: ${error}`
            : `Version: ${serverInfo?.version ?? "loading"}`}
        </p>
      </section>
    </main>
  );
}

export default function register(_api: AddonApi): AddonRegistration {
  return {
    Component: AgentStatusPage,
  };
}
