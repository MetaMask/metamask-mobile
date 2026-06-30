import type { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  MetaMetricsEvents,
  mergeAssetViewedProperties,
} from '../../../../../core/Analytics';
import { getDecimalChainId } from '../../../../../util/networks';
import {
  selectDestToken,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';

const trackedPageViewRouteKeys = new Set<string>();

export const useTrackSwapPageViewed = (
  location: MetaMetricsSwapsEventSource,
  routeKey?: string,
) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);

  const hasTrackedPageView = useRef(false);

  useEffect(() => {
    const hasTrackedRouteKey =
      routeKey && trackedPageViewRouteKeys.has(routeKey);
    const shouldTrackPageView =
      sourceToken && !hasTrackedPageView.current && !hasTrackedRouteKey;

    if (shouldTrackPageView) {
      hasTrackedPageView.current = true;
      if (routeKey) {
        trackedPageViewRouteKeys.add(routeKey);
      }
      const pageViewedProperties = {
        chain_id_source: getDecimalChainId(sourceToken.chainId),
        chain_id_destination: getDecimalChainId(destToken?.chainId),
        token_symbol_source: sourceToken.symbol,
        token_symbol_destination: destToken?.symbol,
        token_address_source: sourceToken.address,
        token_address_destination: destToken?.address,
        location,
      };
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWAP_PAGE_VIEWED)
          .addProperties(pageViewedProperties)
          .build(),
      );
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ASSET_VIEWED)
          .addProperties(
            mergeAssetViewedProperties('Swaps', pageViewedProperties),
          )
          .build(),
      );
    }
  }, [
    sourceToken,
    destToken,
    location,
    routeKey,
    trackEvent,
    createEventBuilder,
  ]);
};
