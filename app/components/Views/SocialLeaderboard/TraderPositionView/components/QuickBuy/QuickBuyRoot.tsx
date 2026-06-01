import {
  BottomSheet,
  type BottomSheetRef,
  Box,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { selectIsSubmittingTx } from '../../../../../../core/redux/slices/bridge';
import QuickBuyAmountScreen from './QuickBuyAmountScreen';
import QuickBuyPayWithScreen from './QuickBuyPayWithScreen';
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
import { useElevatedSurface } from '../../../../../../util/theme/themeUtils';

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
      return <QuickBuyPayWithScreen />;
    case 'quoteDetails':
      return <QuickBuyQuoteDetailsScreen />;
    case 'selectQuote':
      return <QuickBuySelectQuoteScreen />;
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
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isContentReady, setIsContentReady] = useState(false);
  const [activeScreen, setActiveScreen] = useState<QuickBuyScreen>('amount');
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const surfaceClass = useElevatedSurface();

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet(() => {
      setIsContentReady(true);
    });
  }, []);

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
    <BottomSheet
      ref={bottomSheetRef}
      isInteractable={!isSubmittingTx}
      onClose={onClose}
      twClassName={surfaceClass}
    >
      {isContentReady ? (
        <QuickBuyProvider
          target={target}
          onClose={onClose}
          features={features}
          analyticsContext={analyticsContext}
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
        >
          <Box
            testID="quick-buy-content-container"
            onLayout={handleContentLayout}
            style={lockedHeight !== null ? { height: lockedHeight } : undefined}
          >
            {renderActiveScreen(activeScreen, children)}
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
    </BottomSheet>
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
