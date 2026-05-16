import type { AddonApi, AddonPageProps, AddonRegistration } from "#/addons";
import "./styles.css";

function AgentStatusPage({ api, manifest, basePath }: AddonPageProps) {
  return (
    <main className="agent-status-addon">
      <section className="agent-status-addon__panel">
        <p className="agent-status-addon__eyebrow">Local add-on</p>
        <h1>{manifest.title}</h1>
        <p>
          This page is mounted at <code>{basePath}</code> and can navigate
          inside its add-on namespace.
        </p>
        <button type="button" onClick={() => api.navigate("details")}>
          Open details
        </button>
      </section>
    </main>
  );
}

export default function register(_api: AddonApi): AddonRegistration {
  return {
    Component: AgentStatusPage,
  };
}
