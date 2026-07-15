import { Trans, useTranslation } from "react-i18next";
import { ExternalLink, Laptop } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import {
  ManualConnectionColumn,
  type ManualConnectionColumnProps,
} from "../backend-form-modal";
import {
  LOCAL_BACKEND_COMMAND,
  LOCAL_BACKEND_DOCS_URL,
} from "./add-backend-options";
import { OptionHeader } from "./option-header";
import { BackendSetupNote } from "./backend-setup-note";

const SETUP_NOTE_INLINE_CODE = {
  cmd: <code className="text-content-2" />,
};

export function LocalBackendDetails({
  onConnected,
  testIdRoot,
}: Pick<ManualConnectionColumnProps, "onConnected" | "testIdRoot">) {
  const { t } = useTranslation("openhands");

  return (
    <div className="flex flex-col gap-5">
      <OptionHeader
        icon={Laptop}
        title={t(I18nKey.BACKEND$ADD_OPTION_LOCAL_TITLE)}
        description={t(I18nKey.BACKEND$LOCAL_DETAILS_DESC)}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col gap-4">
          <BackendSetupNote title={t(I18nKey.BACKEND$LOCAL_NOTE_TITLE)}>
            <Trans
              ns="openhands"
              i18nKey={I18nKey.BACKEND$LOCAL_NOTE_BODY}
              values={{ command: LOCAL_BACKEND_COMMAND }}
              components={SETUP_NOTE_INLINE_CODE}
            />
          </BackendSetupNote>

          <BackendSetupNote title={t(I18nKey.BACKEND$DOCS_TITLE)}>
            <a
              href={LOCAL_BACKEND_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {t(I18nKey.BACKEND$LOCAL_DOCS_LINK)}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </BackendSetupNote>
        </div>

        <ManualConnectionColumn
          onConnected={onConnected}
          testIdRoot={testIdRoot}
          requireApiKey={false}
          submitLabel={t(I18nKey.BACKEND$CONNECT)}
          submittingLabel={t(I18nKey.ONBOARDING$BACKEND_STATUS_CHECKING)}
        />
      </div>
    </div>
  );
}
