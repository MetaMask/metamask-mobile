import { BigNumber } from 'bignumber.js';
import { useMemo } from 'react';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { useSelector } from 'react-redux';
import { selectTokensByChainIdAndAddress } from '../../../../../selectors/tokensController';

/**
 * Calculate the amount of the selected pay token, that is needed for each token required by the transaction.
 */
export function useTransactionPayTokenAmounts() {
  const { payToken } = useTransactionPayToken();
  const { address, chainId } = payToken;

  const tokens = useSelector((state) =>
    selectTokensByChainIdAndAddress(state, chainId),
  );

  const tokenDecimals = tokens[address.toLowerCase()]?.decimals ?? 18;

  const fiatRequest = useMemo(
    () => [
      {
        address,
        chainId,
      },
    ],
    [address, chainId],
  );

  const tokenFiatRate = useTokenFiatRates(fiatRequest)[0];

  const { fiatValues } = useTransactionRequiredFiat();

  return useMemo(() => {
    if (!tokenFiatRate) {
      return undefined;
    }

    return fiatValues.map((fiatValue) =>
      calculateAmount(fiatValue, tokenFiatRate, tokenDecimals),
    );
  }, [fiatValues, tokenFiatRate, tokenDecimals]);
}

function calculateAmount(
  fiatAmount: number | undefined,
  fiatRate: number,
  decimals: number,
) {
  if (!fiatAmount) {
    return undefined;
  }

  const amountDecimals = new BigNumber(fiatAmount).div(fiatRate);
  const amountRaw = amountDecimals.shiftedBy(decimals).toFixed(0);

  return amountRaw;
}
