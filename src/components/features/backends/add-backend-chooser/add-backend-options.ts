import { type ComponentType } from "react";
import { Cloud, Laptop, Server } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";

export type AddBackendOptionId = "cloud" | "local" | "remote";

export interface AddBackendOption {
  id: AddBackendOptionId;
  titleKey: I18nKey;
  descriptionKey: I18nKey;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

export const ADD_BACKEND_OPTIONS: AddBackendOption[] = [
  {
    id: "cloud",
    titleKey: I18nKey.BACKEND$CLOUD_TITLE,
    descriptionKey: I18nKey.BACKEND$ADD_OPTION_CLOUD_DESC,
    icon: Cloud,
  },
  {
    id: "local",
    titleKey: I18nKey.BACKEND$ADD_OPTION_LOCAL_TITLE,
    descriptionKey: I18nKey.BACKEND$ADD_OPTION_LOCAL_DESC,
    icon: Laptop,
  },
  {
    id: "remote",
    titleKey: I18nKey.BACKEND$ADD_OPTION_REMOTE_TITLE,
    descriptionKey: I18nKey.BACKEND$ADD_OPTION_REMOTE_DESC,
    icon: Server,
  },
];

export const ENTERPRISE_QUICK_START_URL =
  "https://docs.openhands.dev/enterprise/quick-start";
export const LOCAL_BACKEND_DOCS_URL =
  "https://docs.openhands.dev/openhands/usage/agent-canvas/backend-setup/local";
export const REMOTE_BACKEND_DOCS_URL =
  "https://docs.openhands.dev/openhands/usage/agent-canvas/backend-setup/vm";

export const LOCAL_BACKEND_COMMAND = "agent-canvas --backend-only --port 8001";
export const REMOTE_PUBLIC_FLAG = "--public";
export const REMOTE_API_KEY_ENV = "LOCAL_BACKEND_API_KEY";
export const REMOTE_SSH_TUNNEL_URL = "http://localhost:8000";
