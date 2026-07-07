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
  showFiat: boolean;
}

function formatDisplayAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}

export const SpendableBalanceSection = ({
  totalBalance,
  symbol,
  baseReserve,
  fiatValue,
  showFiat,
}: SpendableBalanceSectionProps) => {
  const { totalDisplay, spendableDisplay, reservedDisplay } = useMemo(() => {
    const spendable = computeSpendableBalance(totalBalance, baseReserve);
    const total = Number.parseFloat(totalBalance);
    const reserved = Number.parseFloat(baseReserve);
    const spendableNumber = Number.parseFloat(spendable);

    return {
      totalDisplay: `${formatDisplayAmount(
        Number.isFinite(total) ? total : 0,
      )} ${symbol}`,
      spendableDisplay: `${formatDisplayAmount(
        Number.isFinite(spendableNumber) ? spendableNumber : 0,
      )} ${symbol}`,
      reservedDisplay: `${formatDisplayAmount(
        Number.isFinite(reserved) ? reserved : 0,
      )} ${symbol}`,
    };
  }, [baseReserve, symbol, totalBalance]);

  return (
    <Box
      testID={SpendableBalanceSectionTestIds.CONTAINER}
      flexDirection={BoxFlexDirection.Column}
      twClassName="px-4 py-3 gap-3"
    >
      <Text variant={TextVariant.HeadingSm}>{strings('asset_spendable_balance.balance')}</Text>
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
            {totalDisplay}
          </Text>
        </Box>
        {showFiat ? (
          <Box
            flexDirection={BoxFlexDirection.Column}
            twClassName="flex-1 gap-1"
          >
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
        ) : null}
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
