import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import {
  selectConversionRate,
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectChainId } from '../../../../selectors/networkController';
import {
  hexToBN,
  renderFromWei,
  weiToFiat,
  weiToFiatNumber,
} from '../../../../util/number';
import BigNumber from 'bignumber.js';

const useBalance = () => {
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const chainId = useSelector(selectChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const conversionRate = useSelector(selectConversionRate) ?? 1;
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);

  const rawAccountBalance = selectedAddress
    ? accountsByChainId[chainId]?.[selectedAddress]?.balance
    : '0';

  const stakedBalance = selectedAddress
    ? accountsByChainId[chainId]?.[selectedAddress]?.stakedBalance || '0'
    : '0';

  console.log('accountsByChainId', accountsByChainId, chainId, selectedAddress);

  const balanceETH = useMemo(
    () => renderFromWei(rawAccountBalance),
    [rawAccountBalance],
  );

  const balanceWei = useMemo(
    () => hexToBN(rawAccountBalance),
    [rawAccountBalance],
  );

  const balanceFiat = useMemo(
    () => weiToFiat(balanceWei, conversionRate, currentCurrency),
    [balanceWei, conversionRate, currentCurrency],
  );

  const balanceFiatNumber = useMemo(
    () => weiToFiatNumber(balanceWei, conversionRate, 2),
    [balanceWei, conversionRate],
  );

  const formattedStakedBalanceETH = useMemo(
    () => `${renderFromWei(stakedBalance)} ETH`,
    [stakedBalance],
  );

  const stakedBalanceFiatNumber = useMemo(
    () => weiToFiatNumber(stakedBalance, conversionRate),
    [stakedBalance, conversionRate],
  );

  const formattedStakedBalanceFiat = useMemo(() => {
    const stakedBalanceFiatValue = BigNumber(
      Math.floor(
        BigNumber(stakedBalance)
          .multipliedBy(currencyRates?.ETH?.conversionRate ?? 0)
          .dividedBy(10 ** 18)
          .multipliedBy(100)
          .toNumber(),
      ),
    )
      .dividedBy(100)
      .toNumber();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currentCurrency,
    }).format(stakedBalanceFiatValue);
    // return weiToFiat(
    //   // TODO: Replace "any" with type
    //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //   hexToBN(stakedBalance) as any,
    //   conversionRate,
    //   currentCurrency,
    // );
  }, [currentCurrency, stakedBalance, currencyRates?.ETH?.conversionRate]);

  return {
    balanceETH,
    balanceFiat,
    balanceWei,
    balanceFiatNumber,
    stakedBalanceWei: hexToBN(stakedBalance).toString(),
    formattedStakedBalanceETH,
    stakedBalanceFiatNumber,
    formattedStakedBalanceFiat,
    conversionRate,
    currentCurrency,
  };
};

export default useBalance;
