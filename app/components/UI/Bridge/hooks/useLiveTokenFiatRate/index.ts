import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useOHLCVRealtime } from '../../../Charts/AdvancedChart/useOHLCVRealtime';
import type { BridgeToken } from '../../types';
import { normalizeTokenAddress } from '../../utils/tokenUtils';
import { useTokenFiatRate } from '../useTokenFiatRate';
import { UseLiveTokenFiatRateOptions } from './types';

const DEFAULT_OPTIONS = {
  interval: '1m',
  timePeriod: '1d',
  enabled: true,
} as const satisfies Required<UseLiveTokenFiatRateOptions>;

/**
 * Token fiat rate taken from the real-time OHLCV stream, falling back to the
 * polled Redux rate from {@link useTokenFiatRate}.
 *
 * The live value is the close of the in-progress candle, i.e. the most recent
 * traded price, refreshed every 5s. {@link useOHLCVRealtime} owns the socket:
 * it subscribes to the `market-data.v1` channel, polls the `/latest` REST
 * endpoint while the stream is stale or the chain is down, and ref-counts the
 * subscription so pricing the same asset twice costs one channel. The Redux
 * rate is only used when neither source can price the token, e.g. an asset the
 * market-data channel does not serve.
 */
export const useLiveTokenFiatRate = (
  token?: BridgeToken,
  {
    interval = DEFAULT_OPTIONS.interval,
    timePeriod = DEFAULT_OPTIONS.timePeriod,
    enabled = DEFAULT_OPTIONS.enabled,
  }: UseLiveTokenFiatRateOptions = {},
) => {
  const fallbackRate = useTokenFiatRate(token);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currency = (currentCurrency || 'usd').toLowerCase();

  const assetId = useMemo(() => {
    if (!token?.address || !token?.chainId) {
      return '';
    }

    try {
      return (
        formatAddressToAssetId(
          normalizeTokenAddress(token.address, token.chainId),
          token.chainId,
        ) ?? ''
      );
    } catch {
      // Throws for chains outside XChain Swaps/Bridge support, which have no
      // market-data channel anyway.
      return '';
    }
  }, [token?.address, token?.chainId]);

  const { latestBar } = useOHLCVRealtime({
    assetId,
    interval,
    currency,
    timePeriod,
    enabled: enabled && Boolean(assetId),
  });

  const liveRate = enabled && assetId ? latestBar?.close : undefined;

  return liveRate && liveRate > 0 ? liveRate : fallbackRate;
};
