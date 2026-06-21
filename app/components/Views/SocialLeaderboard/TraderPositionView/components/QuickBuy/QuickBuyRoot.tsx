import { Box } from '@metamask/design-system-react-native';
import BottomSheetDialog from '../../../../../../component-library/components/BottomSheets/BottomSheet/foundation/BottomSheetDialog/BottomSheetDialog';
import type { BottomSheetDialogRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/foundation/BottomSheetDialog/BottomSheetDialog.types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { selectIsSubmittingTx } from '../../../../../../core/redux/slices/bridge';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
  useSocialLeaderboardAnalytics,
} from '../../../analytics';
import QuickBuyAmountScreen from './QuickBuyAmountScreen';
import QuickBuyTokenSelectScreen from './QuickBuyTokenSelectScreen';
import QuickBuyPriceImpactConfirmScreen from './QuickBuyPriceImpactConfirmScreen';
import QuickBuyQuoteDetailsScreen from './QuickBuyQuoteDetailsScreen';
import QuickBuySelectQuoteScreen from './QuickBuySelectQuoteScreen';
import { QuickBuyProvider } from './QuickBuyContext';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
import QuickBuyBottomSheetSkeleton from './QuickBuyBottomSheetSkeleton';
import type {
  QuickBuyAnalyticsContext,
  QuickBuyFeatures,
  QuickBuyRootProps,
  QuickBuyScreen,
  QuickBuyTarget,
} from './types';
import {
  makeScreenTransitions,
  SCREEN_DEPTH,
  type ScreenDirection,
} from './transitions';

/** Activate sheet drag after a small downward move so the pan tracks the finger. */
const QUICK_BUY_SHEET_PAN_PROPS = {
  activeOffsetY: [5, 9999] as [number, number],
};

export type { QuickBuyRootProps } from './types';

const AnimatedScrollView = Animated.createAnimatedComponent(
  GestureHandlerScrollView,
);

function renderActiveScreen(
  activeScreen: QuickBuyScreen,
  children: React.ReactNode | undefined,
): React.ReactNode {
  if (children !== undefined && children !== null) {
    return children;
  }

  switch (activeScreen) {
    case 'payWith':
      return <QuickBuyTokenSelectScreen />;
    case 'quoteDetails':
      return <QuickBuyQuoteDetailsScreen />;
    case 'selectQuote':
      return <QuickBuySelectQuoteScreen />;
    case 'priceImpactConfirm':
      return <QuickBuyPriceImpactConfirmScreen />;
    case 'amount':
    default:
      return <QuickBuyAmountScreen />;
  }
}

interface QuickBuyRootInnerProps {
  target: QuickBuyTarget;
  onClose: () => void;
  features: QuickBuyFeatures;
  analyticsContext?: QuickBuyAnalyticsContext;
  children?: React.ReactNode;
}

const QuickBuyRootInner: React.FC<QuickBuyRootInnerProps> = ({
  target,
  onClose,
  features,
  analyticsContext,
  children,
}) => {
  const tw = useTailwind();
  const { track } = useSocialLeaderboardAnalytics();
  const bottomSheetRef = useRef<BottomSheetDialogRef>(null);
  const [isContentReady, setIsContentReady] = useState(false);
  const [activeScreen, setActiveScreen] = useState<QuickBuyScreen>('amount');
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  // True once a dismissal is requested via the CTA/Cancel so the content drops
  // with the sheet instead of running its horizontal screen-exit transition.
  const [isClosing, setIsClosing] = useState(false);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);

  const directionSV = useSharedValue<ScreenDirection>(1);
  // Suppresses the enter animation on the initial screen when the sheet opens;
  // transitions only kick in once the user navigates between screens.
  const [hasNavigated, setHasNavigated] = useState(false);
  const { entering, exiting } = useMemo(
    () => makeScreenTransitions(directionSV),
    [directionSV],
  );

  const navigateToScreen = useCallback(
    (next: QuickBuyScreen) => {
      setHasNavigated(true);
      setActiveScreen((current) => {
        directionSV.value =
          SCREEN_DEPTH[next] >= SCREEN_DEPTH[current] ? 1 : -1;
        return next;
      });
    },
    [directionSV],
  );

  const trackSheetViewed = useCallback(() => {
    const source = analyticsContext?.source;
    if (!source || !target.tokenSymbol) {
      return;
    }
    track(MetaMetricsEvents.SOCIAL_QUICK_BUY_SHEET_VIEWED, {
      [SocialLeaderboardEventProperties.ASSET_NAME]: target.tokenSymbol,
      ...(typeof analyticsContext.marketCap === 'number'
        ? {
            [SocialLeaderboardEventProperties.MARKET_CAP]:
              analyticsContext.marketCap,
          }
        : {}),
      [SocialLeaderboardEventProperties.SOURCE]: source,
      [SocialLeaderboardEventProperties.TRADER_TRADE_TYPE]:
        analyticsContext.traderTradeType ??
        SocialLeaderboardEventValues.TRADER_TRADE_TYPE.BUY,
    });
  }, [analyticsContext, target.tokenSymbol, track]);

  const handleSheetOpen = useCallback(() => {
    setIsContentReady(true);
    trackSheetViewed();
  }, [trackSheetViewed]);

  // Animate the sheet down (then run the parent's onClose) and flag the content
  // as closing so it doesn't slide horizontally on the way out. Falls back to a
  // direct onClose when the imperative handle isn't available.
  const requestClose = useCallback(() => {
    setIsClosing(true);
    const sheet = bottomSheetRef.current;
    if (sheet?.onCloseDialog) {
      sheet.onCloseDialog(onClose);
    } else {
      onClose();
    }
  }, [onClose]);

  const handleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (lockedHeight !== null) {
        return;
      }
      const { height } = event.nativeEvent.layout;
      if (height > 0) {
        setLockedHeight(height);
      }
    },
    [lockedHeight],
  );

  return (
    <BottomSheetDialog
      ref={bottomSheetRef}
      isInteractable={!isSubmittingTx}
      onClose={onClose}
      onOpen={handleSheetOpen}
      panGestureHandlerProps={QUICK_BUY_SHEET_PAN_PROPS}
    >
      {isContentReady ? (
        <QuickBuyProvider
          target={target}
          onClose={requestClose}
          features={features}
          analyticsContext={analyticsContext}
          activeScreen={activeScreen}
          setActiveScreen={navigateToScreen}
        >
          <Box
            testID="quick-buy-content-container"
            onLayout={handleContentLayout}
            style={lockedHeight !== null ? { height: lockedHeight } : undefined}
          >
            <Animated.View
              key={activeScreen}
              entering={hasNavigated ? entering : undefined}
              exiting={isClosing ? undefined : exiting}
              style={lockedHeight !== null ? tw.style('flex-1') : undefined}
            >
              {renderActiveScreen(activeScreen, children)}
            </Animated.View>
          </Box>
        </QuickBuyProvider>
      ) : (
        <AnimatedScrollView
          style={tw.style('shrink')}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <QuickBuyBottomSheetSkeleton />
        </AnimatedScrollView>
      )}
    </BottomSheetDialog>
  );
};

/**
 * Compound Quick Buy root — bottom sheet, provider, and screen routing.
 */
const QuickBuyRoot: React.FC<QuickBuyRootProps> = ({
  isVisible,
  target,
  onClose,
  features = TOP_TRADERS_QUICK_BUY_FEATURES,
  analyticsContext,
  children,
}) => {
  if (!isVisible || !target) {
    return null;
  }

  return (
    <QuickBuyRootInner
      target={target}
      onClose={onClose}
      features={features}
      analyticsContext={analyticsContext}
    >
      {children}
    </QuickBuyRootInner>
  );
};

export default QuickBuyRoot;
