import { BigNumber } from 'bignumber.js';
import { useMemo } from 'react';
import { usePayAsset } from './usePayAsset';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { useTokenFiatRates } from '../useTokenFiatRates';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';

export function useTransactionPayTokenAmounts() {
  const { payAsset } = usePayAsset();
  const { address, chainId } = payAsset;

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

  const tokenDecimals =
    tokensByAddress[payAsset.address.toLowerCase()]?.decimals ?? 18;

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
