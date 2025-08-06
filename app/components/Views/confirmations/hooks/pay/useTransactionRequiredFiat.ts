import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo } from 'react';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('transaction-pay');

export const PAY_BRIDGE_SLIPPAGE = 0.02;
export const PAY_BRIDGE_FEE = 0.005;

/**
 * Calculate the fiat value of any tokens required by the transaction.
 * Necessary for MetaMask Pay to calculate how much of the selected pay token is needed.
 */
export function useTransactionRequiredFiat() {
  const transactionMeta = useTransactionMetadataOrThrow();
  const { chainId } = transactionMeta;
  const requiredTokens = useTransactionRequiredTokens();

  const fiatRequests = useMemo(
    () =>
      requiredTokens.map((token) => ({
        address: token.address,
        chainId,
      })),
    [requiredTokens, chainId],
  );

  const tokenFiatRates = useTokenFiatRates(fiatRequests);

  const values = useMemo(
    () =>
      requiredTokens.map((target, index) => {
        const targetFiatRate = tokenFiatRates?.[index] as number;

        const missingFiat = new BigNumber(target.missingHuman).multipliedBy(
          targetFiatRate,
        );

        const feeFiat = missingFiat.multipliedBy(
          PAY_BRIDGE_SLIPPAGE + PAY_BRIDGE_FEE,
        );

        const balanceFiat = new BigNumber(target.balanceHuman).multipliedBy(
          targetFiatRate,
        );

        const totalFiat = missingFiat.plus(feeFiat);
        const totalWithBalanceFiat = totalFiat.plus(balanceFiat);

        return {
          balanceFiat: balanceFiat.toNumber(),
          feeFiat: feeFiat.toNumber(),
          missingFiat: missingFiat.toNumber(),
          totalFiat: totalFiat.toNumber(),
          totalWithBalanceFiat: totalWithBalanceFiat.toNumber(),
        };
      }),
    [requiredTokens, tokenFiatRates],
  );

  const totalFiat = values.reduce<number>(
    (acc, value) => acc + value.totalFiat,
    0,
  );

  const totalWithBalanceFiat = values.reduce<number>(
    (acc, value) => acc + value.totalWithBalanceFiat,
    0,
  );

  useEffect(() => {
    log('Required fiat', values, {
      totalFiat,
      totalWithBalanceFiat,
    });
  }, [values, totalFiat, totalWithBalanceFiat]);

  return {
    values,
    totalFiat,
    totalWithBalanceFiat,
  };
}
