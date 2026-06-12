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
  const { vaultApyQuery, apyDecimal, apyPercent } = useMoneyAccountBalance();
  const formatFiat = useFiatFormatter();

  const amount = useMemo(() => new BigNumber(amountFiat || '0'), [amountFiat]);

  const projected = useMemo(() => {
    if (
      typeof apyDecimal !== 'number' ||
      !isFinite(apyDecimal) ||
      apyDecimal < 0
    ) {
      return null;
    }

    if (!amount.isFinite()) {
      return null;
    }

    return amount.multipliedBy(
      new BigNumber(1).plus(apyDecimal).pow(projectedYears),
    );
  }, [amount, apyDecimal, projectedYears]);

  if (vaultApyQuery.isLoading || projected === null) {
    return null;
  }

  if (amount.isZero()) {
    if (apyPercent === undefined) {
      return null;
    }

    return (
      <View testID="balance-projection">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('confirm.custom_amount.earn_up_to_apy', {
            percentage: apyPercent,
          })}
        </Text>
      </View>
    );
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
