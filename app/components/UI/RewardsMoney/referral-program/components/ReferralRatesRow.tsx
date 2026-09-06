import React from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { EarnRatesView } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { formatRateBps } from '../../utils/format';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';

interface ReferralRatesRowProps {
  rates: EarnRatesView;
}

interface RateTileProps {
  label: string;
  value: string;
  testID: string;
}

const RateTile: React.FC<RateTileProps> = ({ label, value, testID }) => (
  <Box twClassName="flex-1 rounded-2xl bg-background-muted p-4 gap-1">
    <Text
      variant={TextVariant.HeadingMd}
      fontWeight={FontWeight.Bold}
      testID={testID}
    >
      {value}
    </Text>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {label}
    </Text>
  </Box>
);

/**
 * The two program rates side by side.
 *
 * A rate is null whenever its program has no row configured, so a tile is
 * omitted rather than rendered as "0%" — an unconfigured program and a zero
 * rate are different things.
 *
 * The cashback copy deliberately does not claim a referral-exclusive perk:
 * cashback is universal, and a referee's ledger is identical to a
 * never-referred user's.
 */
const ReferralRatesRow: React.FC<ReferralRatesRowProps> = ({ rates }) => {
  const revshare = formatRateBps(rates.revshare_rate_bps);
  const cashback = formatRateBps(rates.cashback_rate_bps);

  if (!revshare && !cashback) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="w-full gap-3"
      testID={REWARDS_MONEY_TEST_IDS.REFERRAL_RATES_ROW}
    >
      {revshare ? (
        <RateTile
          label={strings('rewards_money.referral.revshare_label')}
          value={revshare}
          testID={REWARDS_MONEY_TEST_IDS.REFERRAL_REVSHARE_RATE}
        />
      ) : null}
      {cashback ? (
        <RateTile
          label={strings('rewards_money.referral.cashback_label')}
          value={cashback}
          testID={REWARDS_MONEY_TEST_IDS.REFERRAL_CASHBACK_RATE}
        />
      ) : null}
    </Box>
  );
};

export default ReferralRatesRow;
