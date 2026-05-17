import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MCPPage from "#/routes/mcp";
import SettingsService from "#/api/settings-service/settings-service.api";
import { MOCK_DEFAULT_USER_SETTINGS } from "#/mocks/handlers";
import { Settings } from "#/types/settings";
import { ActiveBackendProvider } from "#/contexts/active-backend-context";

function buildSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...MOCK_DEFAULT_USER_SETTINGS,
    ...overrides,
    agent_settings: {
      ...MOCK_DEFAULT_USER_SETTINGS.agent_settings,
      ...overrides.agent_settings,
    },
    mcp_config: overrides.mcp_config ?? MOCK_DEFAULT_USER_SETTINGS.mcp_config,
  };
}

function renderPage() {
  return render(<MCPPage />, {
    wrapper: ({ children }) => (
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <ActiveBackendProvider>{children}</ActiveBackendProvider>
      </QueryClientProvider>
    ),
  });
}

describe("MCPPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the empty installed state without the MCP Library", async () => {
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(buildSettings());

    renderPage();

    await screen.findByTestId("mcp-installed-empty");
    expect(screen.getByTestId("mcp-installed-empty")).toBeInTheDocument();
    expect(
      screen.queryByTestId("mcp-marketplace-section"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("mcp-marketplace-grid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mcp-search")).not.toBeInTheDocument();
  });

  it("filters installed servers by the search input", async () => {
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      buildSettings({
        agent_settings: {
          ...MOCK_DEFAULT_USER_SETTINGS.agent_settings,
          mcp_config: {
            mcpServers: {
              github: {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-github"],
                env: { GITHUB_PERSONAL_ACCESS_TOKEN: "ghp-secret" },
              },
              slack: {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-slack"],
                env: { SLACK_BOT_TOKEN: "xoxb-abc", SLACK_TEAM_ID: "T01" },
              },
            },
          },
        },
      }),
    );

    renderPage();

    const search = await screen.findByTestId("mcp-search-input");
    fireEvent.change(search, { target: { value: "Slack" } });

    await waitFor(() => {
      expect(screen.getByText("Slack")).toBeInTheDocument();
    });
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });

  it("shows a search-empty state when no installed servers match", async () => {
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      buildSettings({
        agent_settings: {
          ...MOCK_DEFAULT_USER_SETTINGS.agent_settings,
          mcp_config: {
            mcpServers: {
              slack: {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-slack"],
                env: { SLACK_BOT_TOKEN: "xoxb-abc", SLACK_TEAM_ID: "T01" },
              },
            },
          },
        },
      }),
    );

    renderPage();

    const search = await screen.findByTestId("mcp-search-input");
    fireEvent.change(search, {
      target: { value: "totally-not-a-real-server" },
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("mcp-installed-empty-search"),
      ).toBeInTheDocument();
    });
  });

  it("deletes an installed stdio server through the confirmation modal", async () => {
    // Pre-install a Slack stdio server via the SDK-shaped mcp_config
    // the route reads from agent_settings.mcp_config.
    const settingsWithSlack = buildSettings({
      agent_settings: {
        ...MOCK_DEFAULT_USER_SETTINGS.agent_settings,
        mcp_config: {
          mcpServers: {
            slack: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-slack"],
              env: { SLACK_BOT_TOKEN: "xoxb-abc", SLACK_TEAM_ID: "T01" },
            },
          },
        },
      },
    });
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      settingsWithSlack,
    );
    const saveSpy = vi
      .spyOn(SettingsService, "saveSettings")
      .mockResolvedValue(true);

    renderPage();

    const deleteBtn = await screen.findByTestId("delete-mcp-server-button");
    fireEvent.click(deleteBtn);

    const confirmBtn = await screen.findByTestId("confirm-button");
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));
    const sent = (saveSpy.mock.calls[0][0] as Record<string, unknown>)
      .agent_settings_diff as { mcp_config: unknown };
    // Server gets pulled out of mcp_config entirely (parseMcpConfig
    // emits `null` once the last entry is removed).
    expect(sent.mcp_config).toBeNull();
  });

  it("shows Tavily as installed when the persisted mcp_config contains it", async () => {
    // Tavily is now a regular stdio MCP entry (it used to claim to be
    // a built-in driven by search_api_key, but that field was never
    // forwarded to either backend). Installation status comes from
    // the same mcp_config lookup as every other entry.
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      buildSettings({
        agent_settings: {
          ...MOCK_DEFAULT_USER_SETTINGS.agent_settings,
          mcp_config: {
            mcpServers: {
              tavily: {
                command: "npx",
                args: ["-y", "tavily-mcp"],
                env: { TAVILY_API_KEY: "tvly-secret" },
              },
            },
          },
        },
      }),
    );

    renderPage();

    await screen.findByText("Tavily");
    expect(screen.getByTestId("mcp-installed-list")).toBeInTheDocument();
  });

  it("opens the custom server editor when the header 'Add custom server' button is clicked", async () => {
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(buildSettings());

    renderPage();

    const addCustomBtn = await screen.findByTestId("mcp-add-custom-server");
    fireEvent.click(addCustomBtn);

    await waitFor(() => {
      expect(screen.getByTestId("mcp-custom-editor")).toBeInTheDocument();
    });
  });
});
