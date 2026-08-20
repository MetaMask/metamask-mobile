import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../locales/i18n';
import { selectPrivacyMode } from '../../../selectors/preferencesController';

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
  const privacyMode = useSelector(selectPrivacyMode);

  return (
    <Box
      testID={SpendableBalanceSectionTestIds.CONTAINER}
      flexDirection={BoxFlexDirection.Column}
      twClassName="px-4 py-4 gap-3"
    >
      <Text variant={TextVariant.HeadingMd}>
        {strings('asset_overview.your_balance')}
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
          <SensitiveText
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            testID={SpendableBalanceSectionTestIds.TOTAL}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
          >
            {totalDisplay}
          </SensitiveText>
        </Box>
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('asset_spendable_balance.fiat_value')}
          </Text>
          <SensitiveText
            variant={TextVariant.BodyMd}
            testID={SpendableBalanceSectionTestIds.FIAT}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
          >
            {fiatValue ?? '—'}
          </SensitiveText>
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
          <SensitiveText
            variant={TextVariant.BodyMd}
            color={TextColor.SuccessDefault}
            testID={SpendableBalanceSectionTestIds.SPENDABLE}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
          >
            {spendableDisplay}
          </SensitiveText>
        </Box>
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('asset_spendable_balance.base_reserved')}
          </Text>
          <SensitiveText
            variant={TextVariant.BodyMd}
            color={TextColor.SuccessDefault}
            testID={SpendableBalanceSectionTestIds.RESERVED}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
          >
            {reservedDisplay}
          </SensitiveText>
        </Box>
      </Box>
    </Box>
  );
};
