import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  IconColor,
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
import { HistoryKindAvatar } from './EarningsHistoryRows';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import RewardsMetricCard from './RewardsMetricCard';
import ShareCodeSheet from './ShareCodeSheet';
import TermsSheet from './TermsSheet';

interface ReferralHeroCardProps {
  /** Opens the Earnings tab, where these two totals are broken down. */
  onViewEarnings: () => void;
}

const ReferralHeroCard: React.FC<ReferralHeroCardProps> = ({
  onViewEarnings,
}) => {
  const storedCode = useSelector(selectReferralCode);
  const referralCode = storedCode || KOL_REFERRAL_CODE_FALLBACK;
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <Box
      twClassName="gap-3 px-4 pt-8"
      testID={KOL_DASHBOARD_SELECTORS.REFERRAL_HERO}
    >
      {/* Vertical padding only: the divider below is full-bleed, so the rows
          carry their own horizontal padding. */}
      <Box twClassName="rounded-2xl bg-muted py-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4 pb-4"
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName="flex-1 pr-2"
          >
            {strings('rewards.kol.earn_eligible_fees')}
          </Text>
          <ButtonIcon
            iconName={IconName.Info}
            iconProps={{
              color: IconColor.IconAlternative,
              size: IconSize.Md,
            }}
            size={ButtonIconSize.Md}
            // Offsets the 6px inset between the 32px button and 20px glyph so
            // the glyph lines up with the card's 16px content padding.
            twClassName="-mr-1.5"
            onPress={() => setIsTermsOpen(true)}
            accessibilityLabel={strings('rewards.kol.terms_title')}
            testID={KOL_DASHBOARD_SELECTORS.TERMS_INFO_BUTTON}
          />
        </Box>
        <Box twClassName="h-px bg-border-muted" />
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mt-4 px-4"
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
          {/* Button applies `self-start` unless it is full width, which would
              override the row's centering, so it is wrapped to stay centered. */}
          <Box>
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
      </Box>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <RewardsMetricCard
          avatar={<HistoryKindAvatar kind="referrals" />}
          label={strings('rewards.kol.referrals')}
          amount={formatUsd(KOL_EARNINGS_FIXTURE.referralsRecorded)}
          onPress={onViewEarnings}
          testID={KOL_DASHBOARD_SELECTORS.REFERRALS_METRIC}
        />
        <RewardsMetricCard
          avatar={<HistoryKindAvatar kind="commission" />}
          label={strings('rewards.kol.trade_commissions')}
          amount={formatUsd(KOL_EARNINGS_FIXTURE.tradeCommissionsRecorded)}
          onPress={onViewEarnings}
          testID={KOL_DASHBOARD_SELECTORS.TRADE_COMMISSIONS_METRIC}
        />
      </Box>
      <ShareCodeSheet
        isVisible={isShareOpen}
        referralCode={referralCode}
        onClose={() => setIsShareOpen(false)}
      />
      <TermsSheet
        isVisible={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />
    </Box>
  );
};

export default ReferralHeroCard;
