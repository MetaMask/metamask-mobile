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
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { isPositiveNumberOrZero } from '../../../../UI/Money/utils/number';

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

  const amount = useMemo(() => {
    const value = new BigNumber(amountFiat || '0');
    return value.isFinite() ? value : null;
  }, [amountFiat]);

  const projected = useMemo(() => {
    if (amount === null || !isPositiveNumberOrZero(apyDecimal)) {
      return null;
    }

    return amount.multipliedBy(
      new BigNumber(1).plus(apyDecimal).pow(projectedYears),
    );
  }, [amount, apyDecimal, projectedYears]);

  if (vaultApyQuery.isLoading) {
    return (
      <View testID="balance-projection-skeleton">
        <Skeleton height={20} width={160} />
      </View>
    );
  }

  if (
    amount === null ||
    !isPositiveNumberOrZero(apyDecimal) ||
    !isPositiveNumberOrZero(apyPercent)
  ) {
    return null;
  }

  if (amount.isGreaterThan(0) && projected !== null) {
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

  return (
    <View testID="balance-projection-apy-pitch">
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('confirm.custom_amount.earn_up_to_apy', {
          percentage: apyPercent,
        })}
      </Text>
    </View>
  );
}
