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

  const tokenBalanceHex = useMemo(
    () =>
      tokenBalanceResult
        ? Object.values(tokenBalanceResult)[0] ?? '0x0'
        : '0x0',
    [tokenBalanceResult],
  );

  const tokenFiatRate = useTokenFiatRate(tokenAddress, chainId);

  return useMemo(() => {
    if (!token) {
      return undefined;
    }

    const balanceRawValue = new BigNumber(tokenBalanceHex);
    const balanceValue = balanceRawValue.shiftedBy(-token.decimals);

    const balanceFiatValue = tokenFiatRate
      ? balanceValue.multipliedBy(tokenFiatRate)
      : new BigNumber(0);

    const balance = balanceValue.toString(10);
    const balanceFiat = fiatFormatter(balanceFiatValue);
    const tokenFiatAmount = balanceFiatValue.toNumber();

    return {
      ...token,
      address: token.address as Hex,
      balance,
      balanceFiat,
      chainId,
      tokenFiatAmount,
    };
  }, [chainId, fiatFormatter, token, tokenBalanceHex, tokenFiatRate]);
}
