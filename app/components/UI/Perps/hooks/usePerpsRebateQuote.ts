import type { UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type {
  PerpsRebateTrade,
  RebateQuoteResponse,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { selectPerpsRebatesEnabled } from '../../../../selectors/featureFlagController/perpsRebates';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useRebateQuoteQuery } from '../../shared/RebateBanner/useRebateQuoteQuery';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';

export interface UsePerpsRebateQuoteParams {
  /** Prevents a quote outside an active order or position confirmation. */
  enabled?: boolean;
  /** Hyperliquid market name, when a single trade is known. */
  coin?: string;
  /** Perps direction mapped to the Rewards Money trade side. */
  direction?: 'long' | 'short';
  /** Trade notional as a plain decimal USD string. */
  notionalUsd?: string;
}

/**
 * Builds optional trade metadata for the rebate quote.
 *
 * The controller performs the final server-format validation and omits
 * metadata that the service would reject.
 */
export function buildPerpsRebateTrade({
  coin,
  direction,
  notionalUsd,
}: Omit<UsePerpsRebateQuoteParams, 'enabled'>): PerpsRebateTrade | undefined {
  if (!coin || !direction || !notionalUsd) {
    return undefined;
  }

  return {
    coin,
    side: direction === 'long' ? 'BUY' : 'SELL',
    notionalUsd,
  };
}

/**
 * Reads the current profile's Perps rebate rate once per active surface.
 *
 * The query key intentionally excludes trade inputs: the service drops Perps
 * trade metadata today, and refetching on each amount edit would consume the
 * profile's shared Rewards Money rate limit.
 */
export function usePerpsRebateQuote({
  enabled = true,
  coin,
  direction,
  notionalUsd,
}: UsePerpsRebateQuoteParams = {}): UseQueryResult<RebateQuoteResponse, Error> {
  const isPerpsRebatesEnabled = useSelector(selectPerpsRebatesEnabled);
  const address = useSelector(selectPerpsSelectedAccountAddress);

  // The UI is static for every hardware tier. Reading both capabilities keeps
  // this one-shot fetch aligned with the device matrix; only known offline
  // state changes behavior.
  getHardwareTier();

  const trade = buildPerpsRebateTrade({ coin, direction, notionalUsd });

  return useRebateQuoteQuery({
    product: 'perps',
    queryFn: () =>
      Engine.context.RewardsMoneyController.getPerpsRebateQuote(trade),
    enabled: enabled && isPerpsRebatesEnabled,
    keyParts: [address ?? null],
  });
}
