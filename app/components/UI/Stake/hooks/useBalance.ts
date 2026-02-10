import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { RootState } from '../../../../reducers';
import {
  hexToBN,
  renderFromWei,
  weiToFiat,
  weiToFiatNumber,
} from '../../../../util/number';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { EVM_SCOPE } from '../../Earn/constants/networks';
import { selectAsset } from '../../../../selectors/assets/assets-list';

const useBalance = (chainId?: Hex) => {
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const selectedChainId = useSelector(selectEvmChainId);
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const selectedAddress = selectedAccount
    ? getFormattedAddressFromInternalAccount(selectedAccount)
    : '';
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

  const stakedNativeAssetBalanceFiat = useSelector(
    (state: RootState) =>
      selectAsset(state, {
        address: getNativeTokenAddress(balanceChainId),
        chainId: balanceChainId,
        isStaked: true,
      })?.balanceFiat,
  );

  const formattedStakedBalanceFiat = useMemo(() => {
    // Match the fiat balance seen in the asset list.
    // Fallback to the weiToFiat function if the staked native asset balance fiat is not available.
    if (stakedNativeAssetBalanceFiat) {
      return stakedNativeAssetBalanceFiat;
    }

    return weiToFiat(hexToBN(stakedBalance), conversionRate, currentCurrency);
  }, [
    conversionRate,
    currentCurrency,
    stakedBalance,
    stakedNativeAssetBalanceFiat,
  ]);

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
