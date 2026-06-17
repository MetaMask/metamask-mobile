///: BEGIN:ONLY_INCLUDE_IF(stellar)
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

export const StellarNativeBalanceSectionTestIds = {
  CONTAINER: 'stellar-native-balance-section',
  TOTAL: 'stellar-native-total-balance',
  FIAT: 'stellar-native-fiat-value',
  SPENDABLE: 'stellar-native-spendable-balance',
  RESERVED: 'stellar-native-reserved-balance',
} as const;

export interface StellarNativeBalanceSectionProps {
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

export const StellarNativeBalanceSection = ({
  totalBalance,
  symbol,
  baseReserve,
  fiatValue,
  showFiat,
}: StellarNativeBalanceSectionProps) => {
  const { totalDisplay, spendableDisplay, reservedDisplay } = useMemo(() => {
    const total = Number.parseFloat(totalBalance);
    const reserved = Number.parseFloat(baseReserve);
    const spendable = Math.max(
      0,
      (Number.isFinite(total) ? total : 0) -
        (Number.isFinite(reserved) ? reserved : 0),
    );

    return {
      totalDisplay: `${formatDisplayAmount(
        Number.isFinite(total) ? total : 0,
      )} ${symbol}`,
      spendableDisplay: `${formatDisplayAmount(spendable)} ${symbol}`,
      reservedDisplay: `${formatDisplayAmount(
        Number.isFinite(reserved) ? reserved : 0,
      )} ${symbol}`,
    };
  }, [baseReserve, symbol, totalBalance]);

  return (
    <Box
      testID={StellarNativeBalanceSectionTestIds.CONTAINER}
      flexDirection={BoxFlexDirection.Column}
      twClassName="px-4 py-3 gap-3"
    >
      <Text variant={TextVariant.HeadingSm}>
        {strings('stellarNativeBalanceTitle')}
      </Text>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('stellarNativeTotalBalance')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            testID={StellarNativeBalanceSectionTestIds.TOTAL}
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
              {strings('stellarNativeValue')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              testID={StellarNativeBalanceSectionTestIds.FIAT}
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
            {strings('stellarNativeSpendableBalance')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.SuccessDefault}
            testID={StellarNativeBalanceSectionTestIds.SPENDABLE}
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
            {strings('stellarNativeReservedBalance')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.SuccessDefault}
            testID={StellarNativeBalanceSectionTestIds.RESERVED}
          >
            {reservedDisplay}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
///: END:ONLY_INCLUDE_IF
