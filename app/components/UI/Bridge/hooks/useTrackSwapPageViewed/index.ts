import {
  FeatureId,
  type MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
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
import { useSwapsFeatureId } from '../useSwapsFeatureId';

export const useTrackSwapPageViewed = (
  location: MetaMetricsSwapsEventSource,
) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const featureId = useSwapsFeatureId();
  const lastTrackedFeatureId = useRef<FeatureId | undefined>(undefined);

  useEffect(() => {
    const shouldTrackPageView =
      sourceToken && lastTrackedFeatureId.current !== featureId;

    if (shouldTrackPageView) {
      const pageViewedProperties = {
        chain_id_source: getDecimalChainId(sourceToken.chainId),
        chain_id_destination: getDecimalChainId(destToken?.chainId),
        token_symbol_source: sourceToken.symbol,
        token_symbol_destination: destToken?.symbol,
        token_address_source: sourceToken.address,
        token_address_destination: destToken?.address,
        location,
        feature_id: featureId,
      };
      trackEvent(
        createEventBuilder(
          featureId === FeatureId.UNIFIED_SWAP_BRIDGE
            ? MetaMetricsEvents.SWAP_PAGE_VIEWED
            : MetaMetricsEvents.ADVANCED_ORDER_PAGE_VIEWED,
        )
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
      lastTrackedFeatureId.current = featureId;
    }
  }, [
    sourceToken,
    destToken,
    location,
    trackEvent,
    createEventBuilder,
    featureId,
  ]);
};
