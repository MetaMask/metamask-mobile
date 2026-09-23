import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { HistoryKindAvatar } from './EarningsHistoryRows';
import { formatUsd, KOL_EARNINGS_FIXTURE } from './rewardsUiFixtures';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import RewardsMetricCard from './RewardsMetricCard';

interface InvitedBenefitCardProps {
  /** Code the referee accepted; shown in place of the KOL's own share card. */
  referralCode: string;
  /** Opens the Claims tab, where these two totals are broken down. */
  onViewEarnings: () => void;
}

/**
 * Hero slot for a user who joined through a KOL's referral. Mirrors
 * ReferralHeroCard's shape so the two personas read as the same screen.
 */
const InvitedBenefitCard: React.FC<InvitedBenefitCardProps> = ({
  referralCode,
  onViewEarnings,
}) => (
  <Box
    twClassName="mt-3 gap-3 px-4 pt-4"
    testID={KOL_DASHBOARD_SELECTORS.INVITED_HERO}
  >
    <Box twClassName="rounded-2xl bg-muted py-4">
      <Box twClassName="px-4 pb-4">
        <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
          {strings('rewards.kol.invited_benefit_title')}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={KOL_DASHBOARD_SELECTORS.INVITED_BENEFIT_OFFER_ENDS}
        >
          {strings('rewards.kol.invited_benefit_offer_ends')}
        </Text>
      </Box>
      <Box twClassName="h-px bg-border-muted" />
      <Box twClassName="mt-4 px-4">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.kol.invited_referred_by')}
        </Text>
        <Text variant={TextVariant.HeadingLg}>{referralCode}</Text>
      </Box>
    </Box>
    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
      <RewardsMetricCard
        avatar={<HistoryKindAvatar kind="commission" />}
        label={strings('rewards.kol.trading_commissions_section')}
        amount={formatUsd(KOL_EARNINGS_FIXTURE.tradeCommissionsRecorded)}
        onPress={onViewEarnings}
        testID={KOL_DASHBOARD_SELECTORS.INVITED_TRADING_COMMISSIONS}
      />
      <RewardsMetricCard
        avatar={<HistoryKindAvatar kind="rebate" />}
        label={strings('rewards.kol.trading_rebates')}
        amount={formatUsd(KOL_EARNINGS_FIXTURE.tradingRebates)}
        onPress={onViewEarnings}
        testID={KOL_DASHBOARD_SELECTORS.INVITED_TRADING_REBATES}
      />
    </Box>
  </Box>
);

export default InvitedBenefitCard;
