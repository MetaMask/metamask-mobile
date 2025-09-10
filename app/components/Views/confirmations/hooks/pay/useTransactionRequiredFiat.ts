import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo } from 'react';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { Hex, createProjectLogger } from '@metamask/utils';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { useSelector } from 'react-redux';

const log = createProjectLogger('transaction-pay');

export interface TransactionRequiredFiat {
  address: Hex;
  allowUnderMinimum: boolean;
  amountFiat: number;
  amountRaw: string;
  balanceFiat: number;
  feeFiat: number;
  totalFiat: number;
  skipIfBalance: boolean;
}

/**
 * Calculate the fiat value of any tokens required by the transaction.
 * Necessary for MetaMask Pay to calculate how much of the selected pay token is needed.
 */
export function useTransactionRequiredFiat({
  amountOverrides,
  log: isLoggingEnabled,
}: {
  amountOverrides?: Record<Hex, string>;
  log?: boolean;
} = {}): {
  values: TransactionRequiredFiat[];
  totalFiat: number;
} {
  const transactionMeta = useTransactionMetadataOrThrow();
  const { chainId } = transactionMeta;
  const requiredTokens = useTransactionRequiredTokens();

  const { bufferInitial, bufferSubsequent } = useSelector(
    selectMetaMaskPayFlags,
  );

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
          index === 0 ? bufferInitial : bufferSubsequent,
        );

        const balanceFiat = new BigNumber(target.balanceHuman).multipliedBy(
          targetFiatRate,
        );

        const totalFiat = amountFiat.plus(feeFiat);

        return {
          address: target.address,
          allowUnderMinimum: target.allowUnderMinimum,
          amountFiat: amountFiat.toNumber(),
          amountRaw: target.amountRaw,
          balanceFiat: balanceFiat.toNumber(),
          feeFiat: feeFiat.toNumber(),
          totalFiat: totalFiat.toNumber(),
          skipIfBalance: target.skipIfBalance,
        };
      }),
    [
      amountOverrides,
      bufferInitial,
      bufferSubsequent,
      requiredTokens,
      tokenFiatRates,
    ],
  );

  const totalFiat = useMemo(
    () => values.reduce<number>((acc, value) => acc + value.totalFiat, 0),
    [values],
  );

  useEffect(() => {
    if (!isLoggingEnabled) return;

    log('Required fiat', values, {
      totalFiat,
    });
  }, [isLoggingEnabled, totalFiat, values]);

  return {
    values,
    totalFiat,
  };
}
