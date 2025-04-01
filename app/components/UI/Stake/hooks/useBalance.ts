import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectEvmChainId } from '../../../../selectors/networkController';
import {
  hexToBN,
  renderFromWei,
  weiToFiat,
  weiToFiatNumber,
} from '../../../../util/number';

const useBalance = (chainId?: Hex) => {
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const selectedChainId = useSelector(selectEvmChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const balanceChainId = chainId || selectedChainId;
  const conversionRate = currencyRates?.ETH?.conversionRate ?? 1;
  const rawAccountBalance = selectedAddress
    ? accountsByChainId[balanceChainId]?.[selectedAddress]?.balance
    : '0';

  const stakedBalance = selectedAddress
    ? accountsByChainId[balanceChainId]?.[selectedAddress]?.stakedBalance || '0'
    : '0';

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

  const formattedStakedBalanceFiat = useMemo(
    () =>
      weiToFiat(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hexToBN(stakedBalance) as any,
        conversionRate,
        currentCurrency,
      ),
    [currentCurrency, stakedBalance, conversionRate],
  );

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
