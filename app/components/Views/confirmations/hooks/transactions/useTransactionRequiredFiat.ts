import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { useMemo } from 'react';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { useTokenFiatRates } from '../useTokenFiatRates';
import { BridgeToken } from '../../../../UI/Bridge/types';

const SLIPPAGE = 0.02;
const BRIDGE_FEE = 0.005;

export function useTransactionRequiredFiat() {
  const transactionMeta = useTransactionMetadataRequest();
  const chainId = transactionMeta?.chainId as Hex;
  const requiredTokens = useTransactionRequiredTokens();

  const tokens = useTokensWithBalance({
    chainIds: [chainId],
  });

  const tokensByAddress = useMemo(
    () =>
      tokens.reduce((acc, token) => {
        acc[token.address.toLowerCase()] = token;
        return acc;
      }, {} as Record<string, BridgeToken>),
    [tokens],
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

  const tokenDecimals = useMemo(
    () =>
      requiredTokens.map(
        (token) => tokensByAddress[token.address.toLowerCase()]?.decimals ?? 18,
      ),
    [requiredTokens, tokensByAddress],
  );

  const fiatValues = useMemo(
    () =>
      requiredTokens.map((target, index) => {
        const targetDecimals = tokenDecimals?.[index];
        const targetFiatRate = tokenFiatRates?.[index];

        if (!targetFiatRate) {
          return undefined;
        }

        return calculateFiat(target.amount, targetDecimals, targetFiatRate);
      }),
    [requiredTokens, tokenDecimals, tokenFiatRates],
  );

  const fiatTotal = fiatValues.reduce<number>(
    (acc, value) => acc + (value ?? 0),
    0,
  );

  return {
    fiatTotal,
    fiatValues,
  };
}

function calculateFiat(amountRaw: Hex, decimals: number, fiatRate: number) {
  const amountDecimals = new BigNumber(amountRaw, 16).shiftedBy(
    -decimals,
  );

  const amountFiat = amountDecimals.multipliedBy(fiatRate);

  const amountFiatWithFees = amountFiat
    .multipliedBy(1 + SLIPPAGE + BRIDGE_FEE)
    .toNumber();

  return amountFiatWithFees;
}
