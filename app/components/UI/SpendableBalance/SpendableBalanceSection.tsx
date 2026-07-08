import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { computeSpendableBalance } from '../../../util/multichain/spendable-balance';

export const SpendableBalanceSectionTestIds = {
  CONTAINER: 'spendable-balance-section',
  TOTAL: 'spendable-balance-total-balance',
  FIAT: 'spendable-balance-fiat-value',
  SPENDABLE: 'spendable-balance-spendable-balance',
  RESERVED: 'spendable-balance-base-reserved',
} as const;

export interface SpendableBalanceSectionProps {
  totalBalance: string;
  symbol: string;
  baseReserve: string;
  fiatValue: string | undefined;
}

export const SpendableBalanceSection = ({
  totalBalance,
  symbol,
  baseReserve,
  fiatValue,
}: SpendableBalanceSectionProps) => {
  const { totalDisplay, spendableDisplay, reservedDisplay } = useMemo(() => {
    const spendable = computeSpendableBalance(totalBalance, baseReserve);
    return {
      totalDisplay: `${totalBalance} ${symbol}`,
      spendableDisplay: `${spendable} ${symbol}`,
      reservedDisplay: `${baseReserve} ${symbol}`,
    };
  }, [baseReserve, symbol, totalBalance]);

  return (
    <Box
      testID={SpendableBalanceSectionTestIds.CONTAINER}
      flexDirection={BoxFlexDirection.Column}
      twClassName="px-4 py-3 gap-3"
    >
      <Text variant={TextVariant.HeadingSm}>
        {strings('asset_spendable_balance.balance')}
      </Text>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('asset_spendable_balance.total_balance')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            testID={SpendableBalanceSectionTestIds.TOTAL}
          >
            {totalBalance}
          </Text>
        </Box>
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('asset_spendable_balance.fiat_value')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            testID={SpendableBalanceSectionTestIds.FIAT}
          >
            {fiatValue ?? '—'}
          </Text>
        </Box>
      </Box>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('asset_spendable_balance.spendable')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.SuccessDefault}
            testID={SpendableBalanceSectionTestIds.SPENDABLE}
          >
            {spendableDisplay}
          </Text>
        </Box>
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('asset_spendable_balance.base_reserved')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.SuccessDefault}
            testID={SpendableBalanceSectionTestIds.RESERVED}
          >
            {reservedDisplay}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
