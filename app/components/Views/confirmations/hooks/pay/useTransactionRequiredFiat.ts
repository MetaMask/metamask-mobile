import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo } from 'react';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { TransactionToken } from './useTransactionRequiredTokens';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { createProjectLogger } from '@metamask/utils';
import { profiler } from '../../components/edit-amount/profiler';

const log = createProjectLogger('transaction-pay');

export const PAY_BRIDGE_SLIPPAGE = 0.02;
export const PAY_BRIDGE_FEE = 0.005;

/**
 * Calculate the fiat value of any tokens required by the transaction.
 * Necessary for MetaMask Pay to calculate how much of the selected pay token is needed.
 */
export function useTransactionRequiredFiat({
  requiredTokens,
}: {
  requiredTokens: TransactionToken[];
}) {
  profiler.start('useTransactionRequiredFiat');
  const transactionMeta = useTransactionMetadataOrThrow();
  const { chainId } = transactionMeta;

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

        const amountFiat = new BigNumber(target.amountHuman).multipliedBy(
          targetFiatRate,
        );

        const feeFiat = amountFiat.multipliedBy(
          PAY_BRIDGE_SLIPPAGE + PAY_BRIDGE_FEE,
        );

        const balanceFiat = new BigNumber(target.balanceHuman).multipliedBy(
          targetFiatRate,
        );

        const totalFiat = amountFiat.plus(feeFiat);

        return {
          address: target.address,
          amountFiat: amountFiat.toNumber(),
          balanceFiat: balanceFiat.toNumber(),
          feeFiat: feeFiat.toNumber(),
          totalFiat: totalFiat.toNumber(),
          skipIfBalance: target.skipIfBalance,
        };
      }),
    [requiredTokens, tokenFiatRates],
  );

  const totalFiat = values.reduce<number>(
    (acc, value) => acc + value.totalFiat,
    0,
  );

  useEffect(() => {
    log('Required fiat', values, {
      totalFiat,
    });
  }, [values, totalFiat]);

  profiler.stop('useTransactionRequiredFiat');

  return {
    values,
    totalFiat,
  };
}
