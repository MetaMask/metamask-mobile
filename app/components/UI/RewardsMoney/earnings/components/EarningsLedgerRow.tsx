import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { LedgerEntryDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { formatMusd } from '../../utils/format';

interface EarningsLedgerRowProps {
  entry: LedgerEntryDto;
  testID?: string;
}

/**
 * Describes what produced the entry.
 *
 * Only `CASHBACK` is per-trade and names its source. Everything else is a
 * per-UTC-day aggregate with no source fields — a deliberate privacy boundary,
 * since a referrer must never learn which referee produced how much.
 *
 * @param entry - The ledger entry.
 * @returns The subtitle text.
 */
export function describeLedgerEntry(entry: LedgerEntryDto): string {
  if (entry.swaps_source) {
    const { src_asset_symbol: from, dest_asset_symbol: to } =
      entry.swaps_source;
    if (from && to) {
      return strings('rewards_money.ledger.swap_pair', { from, to });
    }
    return strings('rewards_money.ledger.swap');
  }

  if (entry.perps_source) {
    return strings('rewards_money.ledger.perps', {
      coin: entry.perps_source.coin,
    });
  }

  if (entry.entry_count > 1) {
    return strings('rewards_money.ledger.aggregate', {
      count: String(entry.entry_count),
    });
  }

  return strings('rewards_money.ledger.aggregate_single');
}

const ORIGIN_TYPE_LABEL_KEY = {
  CASHBACK: 'rewards_money.origin_type.cashback',
  REFERRAL_REV_SHARE: 'rewards_money.origin_type.referral_rev_share',
  SOCIAL_FOLLOW_TRADE: 'rewards_money.origin_type.social_follow_trade',
} as const;

const EarningsLedgerRow: React.FC<EarningsLedgerRowProps> = ({
  entry,
  testID,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="w-full py-3 gap-3"
    testID={testID}
  >
    <Box twClassName="flex-1 gap-1">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings(ORIGIN_TYPE_LABEL_KEY[entry.earning_origin_type])}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
      >
        {describeLedgerEntry(entry)}
      </Text>
    </Box>
    <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
      {formatMusd(entry.musd_amount)}
    </Text>
  </Box>
);

export default EarningsLedgerRow;
