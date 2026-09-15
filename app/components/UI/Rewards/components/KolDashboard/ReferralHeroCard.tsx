import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectReferralCode } from '../../../../../reducers/rewards/selectors';
import {
  formatUsd,
  KOL_EARNINGS_FIXTURE,
  KOL_REFERRAL_CODE_FALLBACK,
} from './rewardsUiFixtures';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import ShareCodeSheet from './ShareCodeSheet';

const ReferralHeroCard: React.FC = () => {
  const storedCode = useSelector(selectReferralCode);
  const referralCode = storedCode || KOL_REFERRAL_CODE_FALLBACK;
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <Box
      twClassName="gap-3 px-4 pt-4"
      testID={KOL_DASHBOARD_SELECTORS.REFERRAL_HERO}
    >
      <Box twClassName="rounded-2xl bg-muted p-4">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('rewards.kol.earn_eligible_fees')}
        </Text>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mt-4"
        >
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('rewards.kol.your_referral_code')}
            </Text>
            <Text
              variant={TextVariant.HeadingLg}
              testID={KOL_DASHBOARD_SELECTORS.REFERRAL_CODE}
            >
              {referralCode}
            </Text>
          </Box>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Md}
            onPress={() => setIsShareOpen(true)}
            testID={KOL_DASHBOARD_SELECTORS.SHARE_BUTTON}
          >
            {strings('rewards.kol.share')}
          </Button>
        </Box>
      </Box>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <Box
          twClassName="flex-1 rounded-2xl bg-muted p-4"
          testID={KOL_DASHBOARD_SELECTORS.REFERRALS_METRIC}
        >
          <Icon name={IconName.UserCircleAdd} size={IconSize.Md} />
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-3"
          >
            {strings('rewards.kol.referrals')}
          </Text>
          <Text variant={TextVariant.HeadingMd}>
            {formatUsd(KOL_EARNINGS_FIXTURE.referralsRecorded)}
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('rewards.kol.recorded_earnings')}
          </Text>
        </Box>
        <Box
          twClassName="flex-1 rounded-2xl bg-muted p-4"
          testID={KOL_DASHBOARD_SELECTORS.TRADE_COMMISSIONS_METRIC}
        >
          <Icon name={IconName.SwapVertical} size={IconSize.Md} />
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-3"
          >
            {strings('rewards.kol.trade_commissions')}
          </Text>
          <Text variant={TextVariant.HeadingMd}>
            {formatUsd(KOL_EARNINGS_FIXTURE.tradeCommissionsRecorded)}
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('rewards.kol.recorded_earnings')}
          </Text>
        </Box>
      </Box>
      <ShareCodeSheet
        isVisible={isShareOpen}
        referralCode={referralCode}
        onClose={() => setIsShareOpen(false)}
      />
    </Box>
  );
};

export default ReferralHeroCard;
