import { useMemo } from 'react';
import { useCollectiblesPortfolioValue } from '../../../../../UI/Collectibles/hooks/useCollectiblesPortfolioValue';
import type { BalanceSlice, FiatConverter, SliceStatus } from '../../types';

/** Insured NFT value only; wallet USDC is already counted by the Tokens slice. */
export function useCollectiblesSlice(
  toUserCurrency: FiatConverter,
): BalanceSlice {
  const portfolio = useCollectiblesPortfolioValue();
  const converted =
    portfolio.status === 'ready'
      ? toUserCurrency(portfolio.valueUsd)
      : undefined;
  let status: SliceStatus;
  if (portfolio.status === 'unavailable') {
    status = 'ineligible';
  } else if (portfolio.status !== 'ready') {
    status = portfolio.status;
  } else {
    status =
      converted === undefined || !Number.isFinite(converted)
        ? 'error'
        : 'ready';
  }
  const valueFiat = status === 'ready' ? (converted ?? 0) : 0;

  return useMemo<BalanceSlice>(
    () => ({
      key: 'collectibles',
      isVisible: status !== 'ineligible',
      status,
      valueFiat,
    }),
    [status, valueFiat],
  );
}
