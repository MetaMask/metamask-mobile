import {
  BottomSheet,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { selectIsSubmittingTx } from '../../../../../../core/redux/slices/bridge';
import QuickBuyAmountScreen from './QuickBuyAmountScreen';
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
  const isSubmittingTx = useSelector(selectIsSubmittingTx);

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet(() => {
      setIsContentReady(true);
    });
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      isInteractable={!isSubmittingTx}
      onClose={onClose}
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
          {renderActiveScreen(activeScreen, children)}
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
