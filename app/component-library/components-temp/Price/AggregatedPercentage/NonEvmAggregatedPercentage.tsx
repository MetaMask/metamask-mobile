import React from 'react';
import {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import SensitiveText from '../../../../component-library/components/Texts/SensitiveText';
import { View } from 'react-native';
import { renderFiat } from '../../../../util/number';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import styleSheet from './AggregatedPercentage.styles';
import { useStyles } from '../../../hooks';
import {
  FORMATTED_VALUE_PRICE_TEST_ID,
  FORMATTED_PERCENTAGE_TEST_ID,
} from './AggregatedPercentage.constants';
import { DECIMALS_TO_SHOW } from '../../../../components/UI/Tokens/constants';
import {
  getMultichainNetworkAggregatedBalance,
  selectMultichainAssets,
  selectMultichainAssetsRates,
  selectMultichainBalances,
} from '../../../../selectors/multichain/multichain';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectSelectedNonEvmNetworkChainId } from '../../../../selectors/multichainNetworkController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAssetType } from '@metamask/keyring-api';
import { getCalculatedTokenAmount1dAgo } from './AggregatedPercentageCrossChains';

const isValidAmount = (amount: number | null | undefined): boolean =>
  amount !== null && amount !== undefined && !Number.isNaN(amount);

const NonEvmAggregatedPercentage = ({
  privacyMode = false,
}: {
  privacyMode?: boolean;
}) => {
  const { styles } = useStyles(styleSheet, {});

  const currentCurrency = useSelector(selectCurrentCurrency);

  const account = useSelector(selectSelectedInternalAccount);
  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainAssets = useSelector(selectMultichainAssets);
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const nonEvmChainId = useSelector(selectSelectedNonEvmNetworkChainId);

  const nonEvmAccountBalance = getMultichainNetworkAggregatedBalance(
    account as unknown as InternalAccount,
    multichainBalances,
    multichainAssets,
    multichainAssetsRates,
    nonEvmChainId,
  );

  const nonEvmFiatBalancesArray = Object.entries(
    nonEvmAccountBalance?.fiatBalances ?? {},
  ).map(([id, amount]) => ({
    id: id as CaipAssetType,
    fiatAmount: Number(amount),
  }));

  const getNonEvmTotalFiat1dAgo = () => {
    const totalNonEvm1dAgo = nonEvmFiatBalancesArray.reduce(
      (total1dAgo: number, item: { id: CaipAssetType; fiatAmount: number }) => {
        const pricePercentChange1d =
          multichainAssetsRates?.[item.id]?.marketData?.pricePercentChange
            .P1D ?? 0;
        const splTokenFiat1dAgo = getCalculatedTokenAmount1dAgo(
          Number(item.fiatAmount),
          pricePercentChange1d,
        );
        return total1dAgo + Number(splTokenFiat1dAgo);
      },
      0,
    );

    return totalNonEvm1dAgo;
  };

  const totalNonEvmBalance = nonEvmAccountBalance?.totalBalanceFiat;

  if (!totalNonEvmBalance) {
    return null;
  }

  const totalNonEvmBalance1dAgo = getNonEvmTotalFiat1dAgo();
  const amountChange = totalNonEvmBalance - totalNonEvmBalance1dAgo;

  const percentageChange =
    ((totalNonEvmBalance - totalNonEvmBalance1dAgo) / totalNonEvmBalance1dAgo) *
      100 || 0;

  let percentageTextColor = TextColor.Default;

  if (!privacyMode) {
    if (percentageChange === 0) {
      percentageTextColor = TextColor.Default;
    } else if (percentageChange > 0) {
      percentageTextColor = TextColor.Success;
    } else {
      percentageTextColor = TextColor.Error;
    }
  } else {
    percentageTextColor = TextColor.Alternative;
  }

  const formattedPercentage = isValidAmount(percentageChange)
    ? `(${(percentageChange as number) >= 0 ? '+' : ''}${(
        percentageChange as number
      ).toFixed(2)}%)`
    : '';

  const formattedValuePrice = isValidAmount(amountChange)
    ? `${(amountChange as number) >= 0 ? '+' : ''}${renderFiat(
        amountChange,
        currentCurrency,
        DECIMALS_TO_SHOW,
      )} `
    : '';

  return (
    <View style={styles.wrapper}>
      <SensitiveText
        isHidden={privacyMode}
        length="10"
        color={percentageTextColor}
        variant={TextVariant.BodyMDMedium}
        testID={FORMATTED_VALUE_PRICE_TEST_ID}
      >
        {formattedValuePrice}
      </SensitiveText>
      <SensitiveText
        isHidden={privacyMode}
        length="10"
        color={percentageTextColor}
        variant={TextVariant.BodyMDMedium}
        testID={FORMATTED_PERCENTAGE_TEST_ID}
      >
        {formattedPercentage}
      </SensitiveText>
    </View>
  );
};

export default NonEvmAggregatedPercentage;
