import React from "react";
import type { AddonApi, AddonPageProps, AddonRegistration } from "#/addons";
import "./styles.css";

interface ServerInfo {
  uptime?: number;
  idle_time?: number;
  title?: string;
  version?: string;
  sdk_version?: string;
  tools_version?: string;
  workspace_version?: string;
  build_git_sha?: string;
  build_git_ref?: string;
  python_version?: string;
  usable_tools?: string[];
  docs?: string;
  redoc?: string;
}

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
}

interface VersionRowProps {
  label: string;
  value: string | undefined;
}

function formatDuration(totalSeconds: number | undefined): string {
  if (typeof totalSeconds !== "number" || !Number.isFinite(totalSeconds)) {
    return "Unknown";
  }

  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  const parts = [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    minutes ? `${minutes}m` : null,
    remainingSeconds || seconds === 0 ? `${remainingSeconds}s` : null,
  ].filter(Boolean);

  return parts.slice(0, 2).join(" ");
}

function formatGitRef(ref: string | undefined): string {
  return ref?.replace(/^refs\/(?:heads|tags)\//, "") ?? "Unknown";
}

function formatGitSha(sha: string | undefined): string {
  return sha ? sha.slice(0, 12) : "Unknown";
}

function formatValue(value: string | undefined): string {
  return value?.trim() || "Unknown";
}

function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <section className="agent-status-card agent-status-metric">
      <p className="agent-status-card__label">{label}</p>
      <p className="agent-status-metric__value">{value}</p>
      <p className="agent-status-card__detail">{detail}</p>
    </section>
  );
}

function VersionRow({ label, value }: VersionRowProps) {
  return (
    <div className="agent-status-version-row">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>
    </div>
  );
}

function AgentStatusPage({ api }: AddonPageProps) {
  const [serverInfo, setServerInfo] = React.useState<ServerInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshServerInfo = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.fetchJSON<ServerInfo>("/server_info");
      setServerInfo(data);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : String(requestError),
      );
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadServerInfo() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.fetchJSON<ServerInfo>("/server_info");
        if (!cancelled) {
          setServerInfo(data);
        }
      } catch (requestError: unknown) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : String(requestError),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadServerInfo();

    return () => {
      cancelled = true;
    };
  }, [api]);

  const tools = serverInfo?.usable_tools ?? [];
  const statusText = error
    ? "Connection issue"
    : isLoading
      ? "Refreshing"
      : "Connected";

  return (
    <main className="agent-status">
      <header className="agent-status__header">
        <div>
          <p className="agent-status__eyebrow">{api.manifest.name}</p>
          <h1>{serverInfo?.title ?? api.manifest.title}</h1>
          <p className="agent-status__subtitle">
            Local add-on view backed by the live agent server status endpoint.
          </p>
        </div>
        <div className="agent-status__actions">
          <span
            className="agent-status__state"
            data-state={error ? "error" : "ready"}
            aria-live="polite"
          >
            {statusText}
          </span>
          <button
            type="button"
            className="agent-status__refresh"
            onClick={refreshServerInfo}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <section className="agent-status__alert" role="alert">
          <strong>Request failed</strong>
          <span>{error}</span>
        </section>
      ) : null}

      <section className="agent-status__metrics" aria-label="Server timing">
        <MetricCard
          label="Uptime"
          value={formatDuration(serverInfo?.uptime)}
          detail="Total process runtime"
        />
        <MetricCard
          label="Idle time"
          value={formatDuration(serverInfo?.idle_time)}
          detail="Time since the last active task"
        />
        <MetricCard
          label="Usable tools"
          value={tools.length > 0 ? String(tools.length) : "Unknown"}
          detail="Tool registrations advertised by /server_info"
        />
      </section>

      <section className="agent-status__grid">
        <section className="agent-status-card">
          <div className="agent-status-card__heading">
            <p className="agent-status-card__label">Version stack</p>
            <span>{formatGitRef(serverInfo?.build_git_ref)}</span>
          </div>
          <div className="agent-status-version-list">
            <VersionRow label="Agent Server" value={serverInfo?.version} />
            <VersionRow label="SDK" value={serverInfo?.sdk_version} />
            <VersionRow label="Tools" value={serverInfo?.tools_version} />
            <VersionRow
              label="Workspace"
              value={serverInfo?.workspace_version}
            />
          </div>
        </section>

        <section className="agent-status-card">
          <div className="agent-status-card__heading">
            <p className="agent-status-card__label">Runtime</p>
            <span>{formatGitSha(serverInfo?.build_git_sha)}</span>
          </div>
          <dl className="agent-status-runtime">
            <div>
              <dt>Python</dt>
              <dd>{formatValue(serverInfo?.python_version)}</dd>
            </div>
            <div>
              <dt>Docs</dt>
              <dd>
                {formatValue(serverInfo?.docs)}
                {serverInfo?.redoc ? ` and ${serverInfo.redoc}` : ""}
              </dd>
            </div>
          </dl>
        </section>
      </section>

      <section className="agent-status-card">
        <div className="agent-status-card__heading">
          <p className="agent-status-card__label">Advertised tools</p>
          <span>{tools.length} total</span>
        </div>
        <div className="agent-status-tools" aria-label="Usable tools">
          {tools.length > 0 ? (
            tools.map((tool) => (
              <span className="agent-status-tool" key={tool}>
                {tool}
              </span>
            ))
          ) : (
            <span className="agent-status-card__detail">
              Tool metadata is not available yet.
            </span>
          )}
        </div>
      </section>
    </main>
  );
}

export default function register(_api: AddonApi): AddonRegistration {
  return {
    Component: AgentStatusPage,
  };
}
