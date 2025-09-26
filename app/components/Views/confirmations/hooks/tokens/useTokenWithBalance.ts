import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectSingleTokenByAddressAndChainId } from '../../../../../selectors/tokensController';
import { RootState } from '../../../../../reducers';
import { selectSingleTokenBalance } from '../../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { toChecksumAddress } from '../../../../../util/address';
import { useTokenFiatRate } from './useTokenFiatRates';
import { BigNumber } from 'bignumber.js';
import { useMemo } from 'react';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { selectAccountBalanceByChainId } from '../../../../../selectors/accountTrackerController';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { selectConversionRateByChainId } from '../../../../../selectors/currencyRateController';
import { selectTickerByChainId } from '../../../../../selectors/networkController';

export function useTokenWithBalance(tokenAddress: Hex, chainId: Hex) {
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const fiatFormatter = useFiatFormatter();

  const token = useSelector((state: RootState) =>
    selectSingleTokenByAddressAndChainId(state, tokenAddress, chainId),
  );

  const tokenBalanceResult = useSelector((state: RootState) =>
    selectSingleTokenBalance(
      state,
      selectedAddress as Hex,
      chainId,
      toChecksumAddress(tokenAddress),
    ),
  );

  const tokenBalanceHex =
    (tokenBalanceResult ? Object.values(tokenBalanceResult)[0] : '0x0') ??
    '0x0';

  const tokenFiatRate = useTokenFiatRate(tokenAddress, chainId);

  const nativeBalanceResult = useSelector((state: RootState) =>
    selectAccountBalanceByChainId(state, chainId),
  );

  const conversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId),
  );

  const ticker = useSelector((state: RootState) =>
    selectTickerByChainId(state, chainId),
  );

  const nativeBalanceHex = (nativeBalanceResult?.balance as Hex) ?? '0x0';
  const nativeAddress = getNativeTokenAddress(chainId);
  const isNative = tokenAddress.toLowerCase() === nativeAddress.toLowerCase();

  return useMemo(() => {
    if (!token && !isNative) {
      return undefined;
    }

    const balanceRawValue = new BigNumber(
      isNative ? nativeBalanceHex : tokenBalanceHex,
    );

    const decimals = token?.decimals ?? 18;
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
