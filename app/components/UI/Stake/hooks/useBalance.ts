import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectChainId } from '../../../../selectors/networkController';
import {
  hexToBN,
  renderFiat,
  renderFromWei,
  weiToFiat,
  weiToFiatNumber,
} from '../../../../util/number';
import usePooledStakes from './usePooledStakes';

const useBalance = () => {
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const chainId = useSelector(selectChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountChecksummedAddress,
  );
  const conversionRate = useSelector(selectConversionRate) ?? 1;
  const currentCurrency = useSelector(selectCurrentCurrency);

  const rawAccountBalance = selectedAddress
    ? accountsByChainId[chainId]?.[selectedAddress]?.balance
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

  const { pooledStakesData } = usePooledStakes();
  const assets = hexToBN(pooledStakesData.assets).toString('hex');
  const formattedStakedBalanceETH = useMemo(
    () => `${renderFromWei(assets)} ETH`,
    [assets],
  );

  const stakedBalanceFiatNumber = useMemo(
    () => weiToFiatNumber(assets, conversionRate),
    [assets, conversionRate],
  );

  const formattedStakedBalanceFiat = useMemo(
    () => renderFiat(stakedBalanceFiatNumber, currentCurrency, 2),
    [currentCurrency, stakedBalanceFiatNumber],
  );

  return {
    balanceETH,
    balanceFiat,
    balanceWei,
    balanceFiatNumber,
    stakedBalanceWei: assets ?? '0',
    formattedStakedBalanceETH,
    stakedBalanceFiatNumber,
    formattedStakedBalanceFiat,
    conversionRate,
    currentCurrency,
  };
};

export default useBalance;
