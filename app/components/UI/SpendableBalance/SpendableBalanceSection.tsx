import React from 'react';
import {
  Box,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
// design-system-react-native TextVariant is not aligned with the mobile
// component-library TextVariant, so use the local Text component.
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';

export const SpendableBalanceSectionTestIds = {
  CONTAINER: 'spendable-balance-section',
  TOTAL: 'spendable-balance-total-balance',
  FIAT: 'spendable-balance-fiat-value',
  SPENDABLE: 'spendable-balance-spendable-balance',
  RESERVED: 'spendable-balance-base-reserved',
} as const;

export interface SpendableBalanceSectionProps {
  spendableBalance: string;
  minimumReserveBalance: string;
  totalBalance: string;
  symbol: string;
  fiatValue: string | undefined;
}

/**
 * Spendable balance section: breakdown for a native asset (total, spendable, reserved, fiat value).
 *
 * @param params - Spendable balance section parameters
 * @param params.minimumReserveBalance - minimum reserve balance.
 * @param params.spendableBalance - spendable balance.
 * @param params.totalBalance - The total balance
 * @param params.symbol - The symbol of the asset
 * @param params.fiatValue - The fiat value
 */
export const SpendableBalanceSection = ({
  minimumReserveBalance,
  spendableBalance,
  totalBalance,
  symbol,
  fiatValue,
}: SpendableBalanceSectionProps) => {
  const totalDisplay = `${totalBalance} ${symbol}`;
  const spendableDisplay = `${spendableBalance} ${symbol}`;
  const reservedDisplay = `${minimumReserveBalance} ${symbol}`;

  return (
    <Box
      testID={SpendableBalanceSectionTestIds.CONTAINER}
      flexDirection={BoxFlexDirection.Column}
      twClassName="px-4 py-4 gap-3"
    >
      <Text variant={TextVariant.HeadingMD}>
        {strings('asset_overview.your_balance')}
      </Text>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {strings('asset_spendable_balance.total_balance')}
          </Text>
          <Text
            variant={TextVariant.BodyMDMedium}
            testID={SpendableBalanceSectionTestIds.TOTAL}
          >
            {totalDisplay}
          </Text>
        </Box>
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {strings('asset_spendable_balance.fiat_value')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            testID={SpendableBalanceSectionTestIds.FIAT}
          >
            {fiatValue ?? '—'}
          </Text>
        </Box>
      </Box>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {strings('asset_spendable_balance.spendable')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Success}
            testID={SpendableBalanceSectionTestIds.SPENDABLE}
          >
            {spendableDisplay}
          </Text>
        </Box>
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {strings('asset_spendable_balance.base_reserved')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Success}
            testID={SpendableBalanceSectionTestIds.RESERVED}
          >
            {reservedDisplay}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
