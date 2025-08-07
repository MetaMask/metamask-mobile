import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo } from 'react';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { createProjectLogger } from '@metamask/utils';
import { useDeepMemo } from '../useDeepMemo';

const log = createProjectLogger('transaction-pay');

/**
 * Calculate the amount of the selected pay token, that is needed for each token required by the transaction.
 */
export function useTransactionPayTokenAmounts() {
  const { decimals, payToken } = useTransactionPayToken();
  const { address, chainId } = payToken ?? {};

  const fiatRequests = useMemo(() => {
    if (!address || !chainId) {
      return [];
    }

    return [
      {
        address,
        chainId,
      },
    ];
  }, [address, chainId]);

  const tokenFiatRate = useTokenFiatRates(fiatRequests)[0];
  const { values } = useTransactionRequiredFiat();

  const amounts = useDeepMemo(() => {
    if (!tokenFiatRate || !decimals) {
      return undefined;
    }

    return values.map((value) => {
      const amountHuman = new BigNumber(value.totalFiat).div(tokenFiatRate);
      const amountRaw = amountHuman.shiftedBy(decimals).toFixed(0);

      return {
        amountHuman: amountHuman.toString(10),
        amountRaw,
      };
    });
  }, [decimals, tokenFiatRate, values]);

  const totalHuman = amounts
    ?.reduce(
      (acc, { amountHuman }) => acc.plus(new BigNumber(amountHuman ?? '0')),
      new BigNumber(0),
    )
    .toString(10);

  const totalRaw = amounts
    ?.reduce(
      (acc, { amountRaw }) => acc.plus(new BigNumber(amountRaw ?? '0')),
      new BigNumber(0),
    )
    .toFixed(0);

  useEffect(() => {
    log('Pay token amounts', {
      amounts,
      totalHuman,
      totalRaw,
    });
  }, [amounts, totalHuman, totalRaw]);

  return {
    amounts,
    totalHuman,
    totalRaw,
  };
}
