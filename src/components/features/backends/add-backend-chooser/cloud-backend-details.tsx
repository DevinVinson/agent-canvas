import { useTranslation } from "react-i18next";
import { Building2, Cloud } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { modalTitleLgMediumClassName } from "#/utils/modal-classes";
import {
  CloudLoginColumn,
  type CloudLoginColumnProps,
} from "../backend-form-modal";
import { ENTERPRISE_QUICK_START_URL } from "./add-backend-options";
import { OptionHeader } from "./option-header";
import { BenefitList } from "./benefit-list";
import { ExternalButtonLink } from "./external-button-link";

export function CloudBackendDetails({
  onConnected,
  testIdRoot,
}: Pick<CloudLoginColumnProps, "onConnected" | "testIdRoot">) {
  const { t } = useTranslation("openhands");

  return (
    <div className="flex flex-col gap-5">
      <OptionHeader
        icon={Cloud}
        title={t(I18nKey.BACKEND$CLOUD_TITLE)}
        description={t(I18nKey.BACKEND$CLOUD_HEADER_DESC)}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col rounded-lg border border-[var(--oh-border)] bg-base-primary p-5">
          <CloudLoginColumn onConnected={onConnected} testIdRoot={testIdRoot} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 rounded-lg border border-[var(--oh-border)] bg-base-primary p-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <Building2 className="size-12 text-secondary-light" aria-hidden />
            <h4 className={modalTitleLgMediumClassName}>
              {t(I18nKey.BACKEND$ENTERPRISE_TITLE)}
            </h4>
            <p className="text-sm leading-relaxed text-[var(--oh-muted)]">
              {t(I18nKey.BACKEND$ENTERPRISE_DESC)}
            </p>
          </div>

          <BenefitList
            items={[
              t(I18nKey.BACKEND$ENTERPRISE_BENEFIT_DEPLOYMENT),
              t(I18nKey.BACKEND$ENTERPRISE_BENEFIT_RBAC),
              t(I18nKey.BACKEND$ENTERPRISE_BENEFIT_BUDGETING),
              t(I18nKey.BACKEND$ENTERPRISE_BENEFIT_SKILLS),
            ]}
          />

          <div className="mt-auto">
            <ExternalButtonLink
              href={ENTERPRISE_QUICK_START_URL}
              testId={`${testIdRoot}-enterprise-link`}
            >
              {t(I18nKey.BACKEND$ENTERPRISE_LINK)}
            </ExternalButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
