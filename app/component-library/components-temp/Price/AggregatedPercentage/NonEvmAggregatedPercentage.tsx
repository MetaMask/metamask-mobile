import React, { useCallback, useMemo } from 'react';
import {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import SensitiveText from '../../../../component-library/components/Texts/SensitiveText';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import styleSheet from './AggregatedPercentage.styles';
import { useStyles } from '../../../hooks';
import {
  FORMATTED_VALUE_PRICE_TEST_ID,
  FORMATTED_PERCENTAGE_TEST_ID,
} from './AggregatedPercentage.constants';
import {
  getMultichainNetworkAggregatedBalance,
  selectMultichainAssets,
  selectMultichainAssetsRates,
  selectMultichainBalances,
} from '../../../../selectors/multichain/multichain';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAssetType } from '@metamask/keyring-api';
import { getCalculatedTokenAmount1dAgo } from './AggregatedPercentageCrossChains';
import { getFormattedPercentageChange, getFormattedValuePrice } from './utils';
import i18n from '../../../../../locales/i18n';

const isValidAmount = (amount: number | null | undefined): boolean =>
  amount !== null && amount !== undefined && !Number.isNaN(amount);

const NonEvmAggregatedPercentage = ({
  privacyMode = false,
}: {
  privacyMode?: boolean;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const currentCurrency = useSelector(selectCurrentCurrency);

  const account = useSelector(selectSelectedInternalAccount);
  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainAssets = useSelector(selectMultichainAssets);
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);

  // refactor this to memoize
  const nonEvmAccountBalance = useMemo(
    () =>
      getMultichainNetworkAggregatedBalance(
        account as InternalAccount,
        multichainBalances,
        multichainAssets,
        multichainAssetsRates,
      ),
    [account, multichainBalances, multichainAssets, multichainAssetsRates],
  );

  const nonEvmFiatBalancesArray = useMemo(() => {
    if (!nonEvmAccountBalance?.fiatBalances) {
      return [];
    }
    return Object.entries(nonEvmAccountBalance.fiatBalances).map(
      ([id, amount]) => ({
        id: id as CaipAssetType,
        fiatAmount: Number(amount),
      }),
    );
  }, [nonEvmAccountBalance?.fiatBalances]);

  // memoize this
  const getNonEvmTotalFiat1dAgo = useCallback(() => {
    const totalNonEvm1dAgo = nonEvmFiatBalancesArray.reduce(
      (total1dAgo: number, item: { id: CaipAssetType; fiatAmount: number }) => {
        const pricePercentChange1d =
          multichainAssetsRates?.[item.id]?.marketData?.pricePercentChange
            ?.P1D ?? 0;
        const splTokenFiat1dAgo = getCalculatedTokenAmount1dAgo(
          Number(item.fiatAmount),
          pricePercentChange1d,
        );
        return total1dAgo + Number(splTokenFiat1dAgo);
      },
      0,
    );

    return totalNonEvm1dAgo;
  }, [nonEvmFiatBalancesArray, multichainAssetsRates]);

  const totalNonEvmBalance = nonEvmAccountBalance?.totalBalanceFiat;
  if (!totalNonEvmBalance) {
    return null;
  }

  const totalNonEvmBalance1dAgo = getNonEvmTotalFiat1dAgo();
  const amountChange = totalNonEvmBalance - totalNonEvmBalance1dAgo;

  const percentageChange =
    totalNonEvmBalance1dAgo === 0
      ? 0
      : (amountChange / totalNonEvmBalance1dAgo) * 100 || 0;

  let percentageTextColor = TextColor.Default;

  if (!privacyMode) {
    if (percentageChange === 0) {
      percentageTextColor = TextColor.Alternative;
    } else if (percentageChange > 0) {
      percentageTextColor = TextColor.Success;
    } else {
      percentageTextColor = TextColor.Error;
    }
  } else {
    percentageTextColor = TextColor.Alternative;
  }

  const formattedPercentage = isValidAmount(percentageChange)
    ? getFormattedPercentageChange(percentageChange, i18n.locale)
    : '';

  const formattedValuePrice = isValidAmount(amountChange)
    ? getFormattedValuePrice(amountChange, currentCurrency)
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
        style={tw`pl-1`}
      >
        {formattedPercentage}
      </SensitiveText>
    </View>
  );
};

export default React.memo(NonEvmAggregatedPercentage);
