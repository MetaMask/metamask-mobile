import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo } from 'react';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { Hex, createProjectLogger } from '@metamask/utils';
import { useDeepMemo } from '../useDeepMemo';

const log = createProjectLogger('transaction-pay');

/**
 * Calculate the amount of the selected pay token, that is needed for each token required by the transaction.
 */
export function useTransactionPayTokenAmounts({
  amountOverrides,
}: {
  amountOverrides?: Record<Hex, string>;
} = {}) {
  const { payToken } = useTransactionPayToken();
  const { address, chainId, decimals } = payToken ?? {};

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
  const { values } = useTransactionRequiredFiat({ amountOverrides });

  const amounts = useDeepMemo(() => {
    if (!address || !chainId || !tokenFiatRate || !decimals) {
      return undefined;
    }

    return values
      .filter((value) => {
        const hasBalance = value.balanceFiat > value.amountFiat;

        const isSameTokenSelected =
          address.toLowerCase() === value.address.toLowerCase();

        const hasOtherTokenWithoutBalance = values.some(
          (v) =>
            v.address.toLowerCase() !== address.toLowerCase() &&
            v.balanceFiat < v.amountFiat,
        );

        if (value.skipIfBalance && hasBalance) {
          log('Skipping token due to sufficient balance', value.address);
          return false;
        }

        if (isSameTokenSelected && hasBalance) {
          log(
            'Skipping token due to sufficient balance and matching pay token',
            value.address,
          );
          return false;
        }

        if (hasBalance && hasOtherTokenWithoutBalance) {
          log(
            'Skipping token due to sufficient balance and other token without balance',
            value.address,
          );
          return false;
        }

        return true;
      })
      .map((value) => {
        const amountHuman = new BigNumber(value.totalFiat).div(tokenFiatRate);
        const amountRaw = amountHuman.shiftedBy(decimals).toFixed(0);

        return {
          address: value.address,
          amountHuman: amountHuman.toString(10),
          amountRaw,
        };
      });
  }, [address, chainId, decimals, tokenFiatRate, values]);

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
