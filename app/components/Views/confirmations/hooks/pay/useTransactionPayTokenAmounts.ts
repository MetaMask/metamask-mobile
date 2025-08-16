import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo } from 'react';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { useSelector } from 'react-redux';
import { selectTokensByChainIdAndAddress } from '../../../../../selectors/tokensController';
import { createProjectLogger } from '@metamask/utils';
import { useDeepMemo } from '../useDeepMemo';

const log = createProjectLogger('transaction-pay');

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

  const amounts = useDeepMemo(() => {
    if (!tokenFiatRate) {
      return undefined;
    }

    return fiatValues.map((fiatValue) =>
      calculateAmount(fiatValue, tokenFiatRate, tokenDecimals),
    );
  }, [fiatValues, tokenFiatRate, tokenDecimals]);

  useEffect(() => {
    log('Pay token amounts', amounts);
  }, [amounts]);

  return amounts;
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
