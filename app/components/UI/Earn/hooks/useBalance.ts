import { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectAccountBalanceByChainId } from '../../../../selectors/accountTrackerController';
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
  // currently selected conversion currency from app settings
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const conversionRate = currencyRates?.ETH?.conversionRate ?? 1;

  // currently selected chain id
  const selectedChainId = useSelector(selectEvmChainId);
  // override chain id if provided
  const balanceChainId = chainId ?? selectedChainId;

  const accountBalanceForChainId = useSelector((state: RootState) =>
    selectAccountBalanceByChainId(state, balanceChainId),
  );
  const rawAccountBalance = accountBalanceForChainId?.balance ?? '0';
  const stakedBalance = accountBalanceForChainId?.stakedBalance ?? '0';

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
