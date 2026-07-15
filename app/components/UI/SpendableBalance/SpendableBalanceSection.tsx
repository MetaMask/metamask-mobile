///: BEGIN:ONLY_INCLUDE_IF(stellar)
import React from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import { strings } from '../../../../locales/i18n';
import { useSpendableBalance } from '../TokenDetails/hooks/useSpendableBalance';

export const SpendableBalanceSectionTestIds = {
  CONTAINER: 'spendable-balance-section',
  TOTAL: 'spendable-balance-total-balance',
  FIAT: 'spendable-balance-fiat-value',
  SPENDABLE: 'spendable-balance-spendable-balance',
  RESERVED: 'spendable-balance-base-reserved',
} as const;

export interface SpendableBalanceSectionProps {
  accountId?: string;
  assetId: CaipAssetType;
  totalBalance: string;
  symbol: string;
  fiatValue: string | undefined;
}

/**
 * Spendable balance section: breakdown for a native asset (total, spendable, reserved, fiat value).
 *
 * @param params - Spendable balance section parameters
 * @param params.accountId - Optional account id override.
 * @param params.assetId - CAIP asset id for the native asset.
 * @param params.totalBalance - The total balance
 * @param params.symbol - The symbol of the asset
 * @param params.fiatValue - The fiat value
 */
export const SpendableBalanceSection = ({
  accountId,
  assetId,
  totalBalance,
  symbol,
  fiatValue,
}: SpendableBalanceSectionProps) => {
  const { baseReserve, spendableBalance } = useSpendableBalance({
    accountId,
    assetId,
    totalBalance,
  });

  if (baseReserve === undefined || spendableBalance === undefined) {
    return null;
  }

  const totalDisplay = `${totalBalance} ${symbol}`;
  const spendableDisplay = `${spendableBalance} ${symbol}`;
  const reservedDisplay = `${baseReserve} ${symbol}`;

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
            {totalDisplay}
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
///: END:ONLY_INCLUDE_IF
