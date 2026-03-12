import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useABTest } from '../../../../../hooks';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { getDecimalChainId } from '../../../../../util/networks';
import {
  selectDestToken,
  selectSourceToken,
  selectAbTestContext,
} from '../../../../../core/redux/slices/bridge';
import {
  NUMPAD_QUICK_ACTIONS_AB_KEY,
  NUMPAD_QUICK_ACTIONS_VARIANTS,
} from '../../components/GaslessQuickPickOptions/abTestConfig';

export const useTrackSwapPageViewed = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const abTestContext = useSelector(selectAbTestContext);
  const { variantName, isActive } = useABTest(
    NUMPAD_QUICK_ACTIONS_AB_KEY,
    NUMPAD_QUICK_ACTIONS_VARIANTS,
  );

  const hasTrackedPageView = useRef(false);

  useEffect(() => {
    const shouldTrackPageView = sourceToken && !hasTrackedPageView.current;

    if (shouldTrackPageView) {
      hasTrackedPageView.current = true;
      const pageViewedProperties = {
        chain_id_source: getDecimalChainId(sourceToken.chainId),
        chain_id_destination: getDecimalChainId(destToken?.chainId),
        token_symbol_source: sourceToken.symbol,
        token_symbol_destination: destToken?.symbol,
        token_address_source: sourceToken.address,
        token_address_destination: destToken?.address,
        ...(abTestContext?.assetsASSETS2493AbtestTokenDetailsLayout && {
          ab_tests: {
            assetsASSETS2493AbtestTokenDetailsLayout:
              abTestContext.assetsASSETS2493AbtestTokenDetailsLayout,
          },
        }),
        ...(isActive && {
          active_ab_tests: [
            {
              key: NUMPAD_QUICK_ACTIONS_AB_KEY,
              value: variantName,
            },
          ],
        }),
      };
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWAP_PAGE_VIEWED)
          .addProperties(pageViewedProperties)
          .build(),
      );
    }
  }, [
    sourceToken,
    destToken,
    trackEvent,
    createEventBuilder,
    isActive,
    variantName,
    abTestContext,
  ]);
};
