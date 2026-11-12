import React from 'react';
import {
  Box,
  TextButton,
  TextVariant,
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { FLAT_BANNER_ALERT_STYLE } from '../../../../shared/flatBannerAlertStyle';
import { formatUkMigrationDeadline } from '../../../utils/formatUkMigrationDeadline';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';
import type { AuthBanner } from '../resolveAuthView';

type BannerKind = Exclude<AuthBanner, null>;

const BANNER_COPY: Record<
  BannerKind,
  {
    severity: BannerAlertSeverity;
    titleKey: string;
    bodyKey: string;
  }
> = {
  account_missing: {
    severity: BannerAlertSeverity.Info,
    titleKey: 'card.card_authentication.banner_account_missing_title',
    bodyKey: 'card.card_authentication.banner_account_missing_body',
  },
  no_card: {
    severity: BannerAlertSeverity.Danger,
    titleKey: 'card.card_authentication.banner_no_card_title',
    bodyKey: 'card.card_authentication.banner_no_card_body',
  },
  moved: {
    severity: BannerAlertSeverity.Danger,
    titleKey: 'card.card_authentication.banner_moved_title',
    bodyKey: 'card.card_authentication.banner_moved_body',
  },
  resume_soft: {
    severity: BannerAlertSeverity.Info,
    titleKey: 'card.card_authentication.banner_resume_soft_title',
    bodyKey: 'card.card_authentication.banner_resume_soft_body',
  },
  bad_creds: {
    severity: BannerAlertSeverity.Danger,
    titleKey: 'card.card_authentication.banner_bad_creds_title',
    bodyKey: 'card.card_authentication.banner_bad_creds_body',
  },
};

interface SignInBannerProps {
  banner: BannerKind;
  deadline?: Date | null;
  showMovedAction?: boolean;
  bodyKey?: string;
  onChooseAccount: () => void;
  onImportSrp: () => void;
  onMovedAction: () => void;
}

const SignInBanner = ({
  banner,
  deadline,
  showMovedAction = false,
  bodyKey,
  onChooseAccount,
  onImportSrp,
  onMovedAction,
}: SignInBannerProps) => {
  const copy = BANNER_COPY[banner];
  const resolvedBodyKey = bodyKey ?? copy.bodyKey;
  const description =
    banner === 'resume_soft'
      ? strings(resolvedBodyKey, {
          deadline: deadline
            ? formatUkMigrationDeadline(deadline, { includeYear: true })
            : '',
        })
      : strings(resolvedBodyKey);

  return (
    <BannerAlert
      severity={copy.severity}
      title={strings(copy.titleKey)}
      description={description}
      style={FLAT_BANNER_ALERT_STYLE}
      testID={CardAuthenticationSelectors.BANNER}
    >
      {(banner === 'account_missing' || banner === 'no_card') && (
        <Box twClassName="items-start">
          <TextButton
            variant={TextVariant.BodyMd}
            onPress={onChooseAccount}
            twClassName="py-2"
          >
            {strings(
              banner === 'account_missing'
                ? 'card.card_authentication.banner_account_missing_choose'
                : 'card.card_authentication.banner_no_card_choose',
            )}
          </TextButton>
          {banner === 'account_missing' && (
            <TextButton
              variant={TextVariant.BodyMd}
              onPress={onImportSrp}
              twClassName="py-2"
            >
              {strings(
                'card.card_authentication.banner_account_missing_import',
              )}
            </TextButton>
          )}
        </Box>
      )}
      {banner === 'moved' && showMovedAction && (
        <TextButton
          variant={TextVariant.BodyMd}
          onPress={onMovedAction}
          twClassName="py-2"
        >
          {strings('card.card_authentication.banner_moved_action')}
        </TextButton>
      )}
    </BannerAlert>
  );
};

export default SignInBanner;
