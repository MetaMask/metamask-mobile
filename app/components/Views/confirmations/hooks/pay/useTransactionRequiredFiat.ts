import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo } from 'react';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { Hex, createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('transaction-pay');

export const PAY_BRIDGE_SLIPPAGE = 0.02;
export const PAY_BRIDGE_FEE = 0.005;

/**
 * Calculate the fiat value of any tokens required by the transaction.
 * Necessary for MetaMask Pay to calculate how much of the selected pay token is needed.
 */
export function useTransactionRequiredFiat({
  amountOverrides,
}: {
  amountOverrides?: Record<Hex, string>;
} = {}) {
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

        const amountOverride =
          amountOverrides?.[target.address.toLowerCase() as Hex];

        const amountHuman = amountOverride ?? target.amountHuman;

        const amountFiat = new BigNumber(amountHuman).multipliedBy(
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
          amountHumanOriginal: amountHuman,
          amountFiat: amountFiat.toNumber(),
          balanceFiat: balanceFiat.toNumber(),
          feeFiat: feeFiat.toNumber(),
          totalFiat: totalFiat.toNumber(),
          skipIfBalance: target.skipIfBalance,
        };
      }),
    [amountOverrides, requiredTokens, tokenFiatRates],
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

  return {
    values,
    totalFiat,
  };
}
