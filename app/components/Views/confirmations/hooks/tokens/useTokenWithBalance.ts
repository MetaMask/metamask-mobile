import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectSingleTokenByAddressAndChainId } from '../../../../../selectors/tokensController';
import { RootState } from '../../../../../reducers';
import { selectSingleTokenBalance } from '../../../../../selectors/tokenBalancesController';
import { toChecksumAddress } from '../../../../../util/address';
import { useTokenFiatRate } from './useTokenFiatRates';
import { BigNumber } from 'bignumber.js';
import { useMemo } from 'react';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { selectAccountsByChainId } from '../../../../../selectors/accountTrackerController';
import { selectConversionRateByChainId } from '../../../../../selectors/currencyRateController';
import { selectTickerByChainId } from '../../../../../selectors/networkController';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { getNativeTokenAddress } from '@metamask/assets-controllers';

export function useTokenWithBalance(tokenAddress: Hex, chainId: Hex) {
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);

  const internalAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );

  const selectedEvmAddress =
    (internalAccounts.find((a) => a.type === 'eip155:eoa')?.address as Hex) ??
    selectedAddress;

  const fiatFormatter = useFiatFormatter();
  const nativeTokenAddress = getNativeTokenAddress(chainId);

  const token = useSelector((state: RootState) =>
    selectSingleTokenByAddressAndChainId(state, tokenAddress, chainId),
  );

  const tokenBalanceResult = useSelector((state: RootState) =>
    selectSingleTokenBalance(
      state,
      selectedEvmAddress,
      chainId,
      toChecksumAddress(tokenAddress),
    ),
  );

  const tokenBalanceHex =
    (tokenBalanceResult ? Object.values(tokenBalanceResult)[0] : '0x0') ??
    '0x0';

  const tokenFiatRate = useTokenFiatRate(tokenAddress, chainId);

  const accountsByChainId = useSelector(selectAccountsByChainId);

  const nativeBalanceResult = Object.entries(
    accountsByChainId?.[chainId] ?? {},
  ).find(
    ([address]) => address.toLowerCase() === selectedEvmAddress.toLowerCase(),
  )?.[1];

  const conversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId),
  );

  const ticker = useSelector((state: RootState) =>
    selectTickerByChainId(state, chainId),
  );

  const nativeBalanceHex = (nativeBalanceResult?.balance as Hex) ?? '0x0';

  const isNative =
    tokenAddress.toLowerCase() === nativeTokenAddress.toLowerCase();

  return useMemo(() => {
    if (!token && !isNative) {
      return undefined;
    }

    const balanceRawValue = new BigNumber(
      isNative ? nativeBalanceHex : tokenBalanceHex,
    );

    const balanceRaw = balanceRawValue.toString(10);
    const decimals = Number(token?.decimals ?? 18);
    const balanceValue = balanceRawValue.shiftedBy(-decimals);
    const fiatRate = isNative ? conversionRate : tokenFiatRate;

    const balanceFiatValue = fiatRate
      ? balanceValue.multipliedBy(fiatRate)
      : new BigNumber(0);

    const balance = balanceValue.toString(10);
    const balanceFiat = fiatFormatter(balanceFiatValue);
    const tokenFiatAmount = balanceFiatValue.toNumber();
    const symbol = token?.symbol ?? ticker;

    return {
      ...token,
      address: tokenAddress,
      balance,
      balanceFiat,
      balanceRaw,
      chainId,
      decimals,
      symbol,
      tokenFiatAmount,
    };
  }, [
    chainId,
    conversionRate,
    fiatFormatter,
    isNative,
    nativeBalanceHex,
    ticker,
    token,
    tokenAddress,
    tokenBalanceHex,
    tokenFiatRate,
  ]);
}
