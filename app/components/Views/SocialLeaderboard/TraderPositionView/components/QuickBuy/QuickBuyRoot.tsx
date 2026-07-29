import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useABTest } from '../../../../../../hooks/useABTest';
import { useElevatedSurface } from '../../../../../../util/theme/themeUtils';
import {
  SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_KEY,
  SOCIAL_AI_QUICK_BUY_KEYBOARD_EXPOSURE_METADATA,
  SOCIAL_AI_QUICK_BUY_KEYBOARD_VARIANTS,
} from './abTestConfig';
import {
  buildQuickBuySharedAnalyticsProperties,
  QuickBuyEventProperties,
  QuickBuyEventValues,
} from './analytics';
import { useSocialLeaderboardAnalytics } from '../../../analytics';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
import QuickBuyAmountScreen from './QuickBuyAmountScreen';
import {
  QuickBuyBottomSheetDialog,
  type QuickBuyBottomSheetDialogRef,
} from './QuickBuyBottomSheetDialog';
import {
  QuickBuyBottomSheetOverlay,
  type QuickBuyBottomSheetOverlayRef,
} from './QuickBuyBottomSheetOverlay';
import { QuickBuyProvider } from './QuickBuyContext';
import QuickBuyPriceImpactConfirmScreen from './QuickBuyPriceImpactConfirmScreen';
import QuickBuyQuoteDetailsScreen from './QuickBuyQuoteDetailsScreen';
import QuickBuySelectQuoteScreen from './QuickBuySelectQuoteScreen';
import QuickBuyTokenSelectScreen from './QuickBuyTokenSelectScreen';
import { SHEET_STACK_PUSH_DURATION } from './sheetStackMotion';
import { isSheetStackScreen } from './transitions';
import { Animated, useSheetStackTransition } from './useSheetStackTransition';
import type {
  QuickBuyAnalyticsContext,
  QuickBuyFeatures,
  QuickBuyRootProps,
  QuickBuyScreen,
  QuickBuyTarget,
} from './types';

export type { QuickBuyRootProps } from './types';

function renderScreen(screen: QuickBuyScreen): React.ReactNode {
  switch (screen) {
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
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { track } = useSocialLeaderboardAnalytics();
  const bottomSheetRef = useRef<QuickBuyBottomSheetDialogRef>(null);
  const overlayRef = useRef<QuickBuyBottomSheetOverlayRef>(null);
  const [activeScreen, setActiveScreen] = useState<QuickBuyScreen>('amount');
  // Keep the last pushed screen mounted through the pop animation so the
  // outgoing detail stays visible while it slides off.
  const [renderedDetail, setRenderedDetail] = useState<QuickBuyScreen | null>(
    null,
  );
  // True once a dismissal is requested via the CTA/Cancel so we don't also
  // run a horizontal pop while the sheet is sliding down.
  const [isClosing, setIsClosing] = useState(false);
  // Last screen we already drove stack motion for — ignores Strict Mode's
  // double effect invoke so we don't skip pop/unmount or re-snap mid-push.
  const lastAnimatedScreenRef = useRef<QuickBuyScreen>('amount');
  const unmountDetailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const surfaceClass = useElevatedSurface();

  const {
    isPushed,
    isHeightReady,
    requestPush,
    pop,
    snapToPushed,
    onStackLayout,
    onRootLayout,
    onDetailLayout,
    heightStyle,
    rootScreenStyle,
    detailScreenStyle,
  } = useSheetStackTransition();

  const popRef = useRef(pop);
  popRef.current = pop;
  const requestPushRef = useRef(requestPush);
  requestPushRef.current = requestPush;
  const snapToPushedRef = useRef(snapToPushed);
  snapToPushedRef.current = snapToPushed;

  // Keyboard vs slider A/B test. Resolved here so `Experiment Viewed` fires
  // once the sheet is actually shown (this component only mounts when visible).
  const { variant, variantName } = useABTest(
    SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_KEY,
    SOCIAL_AI_QUICK_BUY_KEYBOARD_VARIANTS,
    SOCIAL_AI_QUICK_BUY_KEYBOARD_EXPOSURE_METADATA,
  );
  const useKeyboard = variant.useKeyboard;

  const navigateToScreen = useCallback((next: QuickBuyScreen) => {
    setActiveScreen(next);
  }, []);

  const trackSheetViewed = useCallback(() => {
    const source = analyticsContext?.source;
    if (!source || !target.tokenSymbol) {
      return;
    }
    track(MetaMetricsEvents.SOCIAL_QUICK_BUY_SHEET_VIEWED, {
      [QuickBuyEventProperties.ASSET_NAME]: target.tokenSymbol,
      ...buildQuickBuySharedAnalyticsProperties(analyticsContext),
      [QuickBuyEventProperties.TRADE_TYPE]:
        analyticsContext.traderTradeType ?? QuickBuyEventValues.TRADE_TYPE.BUY,
    });
  }, [analyticsContext, target.tokenSymbol, track]);

  // Drive in-sheet stack push/pop from activeScreen. Skip while the whole
  // sheet is dismissing so content doesn't also slide horizontally.
  // Push is deferred via requestPush → detail onLayout so we never animate
  // with an unmeasured (0-height) detail, which collapsed the sheet.
  useEffect(() => {
    if (isClosing) {
      lastAnimatedScreenRef.current = activeScreen;
      return;
    }

    const from = lastAnimatedScreenRef.current;
    if (from === activeScreen) {
      return;
    }
    lastAnimatedScreenRef.current = activeScreen;

    if (isSheetStackScreen(activeScreen)) {
      if (unmountDetailTimeoutRef.current !== null) {
        clearTimeout(unmountDetailTimeoutRef.current);
        unmountDetailTimeoutRef.current = null;
      }
      setRenderedDetail(activeScreen);
      if (isSheetStackScreen(from)) {
        // Already drilled in (e.g. quoteDetails ↔ selectQuote) — swap detail
        // content without replaying the push from amount.
        snapToPushedRef.current();
      } else {
        requestPushRef.current();
      }
      return;
    }

    // Returning to amount: pop, then unmount detail after the slide finishes.
    if (isSheetStackScreen(from)) {
      popRef.current();
      if (unmountDetailTimeoutRef.current === null) {
        unmountDetailTimeoutRef.current = setTimeout(() => {
          unmountDetailTimeoutRef.current = null;
          setRenderedDetail(null);
        }, SHEET_STACK_PUSH_DURATION);
      }
    }
  }, [activeScreen, isClosing]);

  // Fade backdrop + flag content closing when dismiss starts (CTA, overlay, or
  // drag) so in-sheet stack doesn't also slide while the sheet tweens down.
  const handleCloseStart = useCallback(() => {
    setIsClosing(true);
    overlayRef.current?.onCloseOverlay();
  }, []);

  // Animate the sheet down (then run the parent's onClose). Falls back to a
  // direct onClose when the imperative handle isn't available.
  const requestClose = useCallback(() => {
    const sheet = bottomSheetRef.current;
    if (sheet?.onCloseDialog) {
      sheet.onCloseDialog(onClose);
    } else {
      handleCloseStart();
      onClose();
    }
  }, [handleCloseStart, onClose]);

  // Keep the bottom safe-area inset only on screens that pin a CTA at the
  // bottom; scroll-only detail screens sit flush to the edge.
  const detailHasBottomCta = renderedDetail === 'priceImpactConfirm';

  // Custom children (tests / compound overrides) use a single layer — the
  // in-sheet stack is for the real amount ↔ payWith / quoteDetails flow.
  const useCustomChildren = children !== undefined && children !== null;

  // Host fills the window like DS BottomSheet so the backdrop can cover the
  // chart behind the dialog. Backdrop / sheet Y stay put during in-sheet stack.
  //
  // Content mounts immediately (no post-open skeleton swap). Until the amount
  // root is measured, keep it in document flow so BottomSheetDialog opens at
  // the real height; absolute + heightStyle only after measure (stack push).
  return (
    <Box twClassName="absolute inset-0" testID="quick-buy-sheet-host">
      <QuickBuyBottomSheetOverlay
        ref={overlayRef}
        onPress={requestClose}
        testID="quick-buy-overlay"
      />
      <QuickBuyBottomSheetDialog
        ref={bottomSheetRef}
        onOpen={trackSheetViewed}
        onCloseStart={handleCloseStart}
        onClose={onClose}
        twClassName={`${surfaceClass} rounded-t-[40px]`}
      >
        <QuickBuyProvider
          key={variantName}
          target={target}
          onClose={requestClose}
          features={features}
          analyticsContext={analyticsContext}
          activeScreen={activeScreen}
          setActiveScreen={navigateToScreen}
          useKeyboard={useKeyboard}
        >
          {useCustomChildren ? (
            <Box testID="quick-buy-content-container">{children}</Box>
          ) : (
            <Animated.View
              testID="quick-buy-content-container"
              onLayout={onStackLayout}
              style={[
                tw.style('w-full overflow-hidden'),
                isHeightReady ? heightStyle : undefined,
              ]}
            >
              <Animated.View
                testID="quick-buy-stack-root"
                onLayout={onRootLayout}
                pointerEvents={isPushed ? 'none' : 'auto'}
                style={[
                  isHeightReady
                    ? tw.style('absolute left-0 right-0 top-0')
                    : tw.style('w-full'),
                  rootScreenStyle,
                ]}
              >
                {renderScreen('amount')}
              </Animated.View>

              {renderedDetail !== null && (
                <Animated.View
                  testID="quick-buy-stack-detail"
                  onLayout={onDetailLayout}
                  pointerEvents={isPushed ? 'auto' : 'none'}
                  style={[
                    tw.style('absolute left-0 right-0 top-0 overflow-hidden'),
                    detailHasBottomCta
                      ? undefined
                      : { marginBottom: -bottomInset },
                    detailScreenStyle,
                  ]}
                >
                  <Box twClassName="flex-1">{renderScreen(renderedDetail)}</Box>
                </Animated.View>
              )}
            </Animated.View>
          )}
        </QuickBuyProvider>
      </QuickBuyBottomSheetDialog>
    </Box>
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
