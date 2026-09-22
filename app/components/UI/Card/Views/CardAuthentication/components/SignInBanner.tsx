import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
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
  onChooseAccount: () => void;
  onImportSrp: () => void;
  onMovedAction: () => void;
}

const SignInBanner = ({
  banner,
  deadline,
  showMovedAction = false,
  onChooseAccount,
  onImportSrp,
  onMovedAction,
}: SignInBannerProps) => {
  const copy = BANNER_COPY[banner];
  const description =
    banner === 'resume_soft'
      ? strings(copy.bodyKey, {
          deadline: deadline
            ? formatUkMigrationDeadline(deadline, { includeYear: true })
            : '',
        })
      : strings(copy.bodyKey);

  return (
    <BannerAlert
      severity={copy.severity}
      title={strings(copy.titleKey)}
      description={description}
      style={FLAT_BANNER_ALERT_STYLE}
      testID={CardAuthenticationSelectors.BANNER}
    >
      {(banner === 'account_missing' || banner === 'no_card') && (
        <Box twClassName="gap-1 mt-1">
          <TouchableOpacity onPress={onChooseAccount}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="text-primary-default py-2"
            >
              {strings(
                banner === 'account_missing'
                  ? 'card.card_authentication.banner_account_missing_choose'
                  : 'card.card_authentication.banner_no_card_choose',
              )}
            </Text>
          </TouchableOpacity>
          {banner === 'account_missing' && (
            <TouchableOpacity onPress={onImportSrp}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="text-primary-default py-2"
              >
                {strings(
                  'card.card_authentication.banner_account_missing_import',
                )}
              </Text>
            </TouchableOpacity>
          )}
        </Box>
      )}
      {banner === 'moved' && showMovedAction && (
        <TouchableOpacity onPress={onMovedAction}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-primary-default py-2"
          >
            {strings('card.card_authentication.banner_moved_action')}
          </Text>
        </TouchableOpacity>
      )}
    </BannerAlert>
  );
};

export default SignInBanner;
