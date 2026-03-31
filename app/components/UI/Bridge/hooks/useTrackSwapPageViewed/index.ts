import { useEffect, useMemo, useRef } from 'react';
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
import {
  TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY,
  TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS,
} from '../../components/TokenSelectorItem.abTestConfig';

export const useTrackSwapPageViewed = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const abTestContext = useSelector(selectAbTestContext);
  const { variantName: numpadVariantName, isActive: isNumpadAbActive } =
    useABTest(NUMPAD_QUICK_ACTIONS_AB_KEY, NUMPAD_QUICK_ACTIONS_VARIANTS);
  const {
    variantName: tokenSelectorVariantName,
    isActive: isTokenSelectorAbActive,
  } = useABTest(
    TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY,
    TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS,
  );

  const activeABTests = useMemo(
    () => [
      ...(isNumpadAbActive
        ? [{ key: NUMPAD_QUICK_ACTIONS_AB_KEY, value: numpadVariantName }]
        : []),
      ...(isTokenSelectorAbActive
        ? [
            {
              key: TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY,
              value: tokenSelectorVariantName,
            },
          ]
        : []),
    ],
    [
      isNumpadAbActive,
      numpadVariantName,
      isTokenSelectorAbActive,
      tokenSelectorVariantName,
    ],
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
        ...(activeABTests.length > 0 && {
          active_ab_tests: activeABTests,
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
    activeABTests,
    abTestContext,
  ]);
};
