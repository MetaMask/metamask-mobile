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

const PROJECTION_YEARS = 5;

export interface ProjectedFiveYearBalanceProps {
  amountFiat: string;
}

export function ProjectedFiveYearBalance({
  amountFiat,
}: ProjectedFiveYearBalanceProps) {
  const { vaultApyQuery } = useMoneyAccountBalance();
  const formatFiat = useFiatFormatter();

  const projected = useMemo(() => {
    const apy = vaultApyQuery.data?.apy;
    if (typeof apy !== 'number' || !isFinite(apy) || apy < 0) {
      return null;
    }

    const amount = new BigNumber(amountFiat || '0');
    if (!amount.isFinite()) {
      return null;
    }

    const growthFactor = new BigNumber(1).plus(
      new BigNumber(apy).dividedBy(100),
    );
    return amount.multipliedBy(growthFactor.pow(PROJECTION_YEARS));
  }, [amountFiat, vaultApyQuery.data?.apy]);

  if (vaultApyQuery.isLoading || projected === null) {
    return null;
  }

  return (
    <View testID="projected-five-year-balance">
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('confirm.custom_amount.projected_five_year_balance')}{' '}
        <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
          {formatFiat(projected)}
        </Text>
      </Text>
    </View>
  );
}
