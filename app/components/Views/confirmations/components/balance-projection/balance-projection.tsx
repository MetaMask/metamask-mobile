import React, { useMemo } from 'react';
import { View } from 'react-native';
import BigNumber from 'bignumber.js';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { strings } from '../../../../../../locales/i18n';

export interface BalanceProjectionProps {
  amountFiat: string;
  projectedYears: number;
}

export function BalanceProjection({
  amountFiat,
  projectedYears,
}: BalanceProjectionProps) {
  const { vaultApyQuery, apyDecimal } = useMoneyAccountBalance();
  const formatFiat = useFiatFormatter();

  const projected = useMemo(() => {
    if (
      typeof apyDecimal !== 'number' ||
      !isFinite(apyDecimal) ||
      apyDecimal < 0
    ) {
      return null;
    }

    const amount = new BigNumber(amountFiat || '0');
    if (!amount.isFinite()) {
      return null;
    }

    return amount.multipliedBy(
      new BigNumber(1).plus(apyDecimal).pow(projectedYears),
    );
  }, [amountFiat, apyDecimal, projectedYears]);

  if (vaultApyQuery.isLoading || projected === null) {
    return null;
  }

  return (
    <View testID="balance-projection">
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('confirm.custom_amount.projected_balance', {
          projectedYears,
        })}{' '}
        <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
          {formatFiat(projected)}
        </Text>
      </Text>
    </View>
  );
}
