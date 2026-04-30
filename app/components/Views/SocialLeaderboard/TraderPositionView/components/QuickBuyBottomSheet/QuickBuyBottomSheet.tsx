import {
  BottomSheet,
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import React, { useCallback, useEffect, useRef, useState } from 'react';
// `react-native-gesture-handler` ScrollView is required for scrolling on
// Android inside a gesture-handler-managed BottomSheet.
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import Animated, {
  type AnimatedRef,
  useAnimatedRef,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import { selectIsSubmittingTx } from '../../../../../../core/redux/slices/bridge';
import { useTheme } from '../../../../../../util/theme';
import QuickBuyAmountInput from './QuickBuyAmountInput';
import QuickBuyBanners from './QuickBuyBanners';
import QuickBuyBottomSheetSkeleton from './QuickBuyBottomSheetSkeleton';
import QuickBuyFooter from './QuickBuyFooter';
import QuickBuyHeader from './QuickBuyHeader';
import { useQuickBuyBottomSheet } from './useQuickBuyBottomSheet';

export interface QuickBuyBottomSheetProps {
  isVisible: boolean;
  position: Position | null;
  marketCap?: number;
  onClose: () => void;
}

interface InnerProps {
  position: Position;
  marketCap?: number;
  onClose: () => void;
}

// `Animated.createAnimatedComponent` lets us attach `useAnimatedRef` to the
// gesture-handler ScrollView so worklets running on the UI thread can drive
// `scrollTo` in lockstep with the Reanimated height animations.
const AnimatedScrollView = Animated.createAnimatedComponent(
  GestureHandlerScrollView,
);

export type QuickBuyScrollAnimatedRef = AnimatedRef<GestureHandlerScrollView>;

interface ContentProps extends InnerProps {
  /**
   * Animated ref to the parent ScrollView. The footer's `useAnimatedReaction`
   * uses this to call Reanimated's `scrollTo` synchronously while the picker
   * or Total breakdown grows, so the Buy button stays pinned at the bottom.
   */
  scrollAnimatedRef: QuickBuyScrollAnimatedRef;
}

/**
 * Heavy subtree — deferred until after the open animation so its hook
 * tree (bridge quotes, balances, rewards, metadata) does not starve the
 * JS thread while the sheet is animating in.
 */
const QuickBuyBottomSheetContent: React.FC<ContentProps> = ({
  position,
  onClose,
  scrollAnimatedRef,
}) => {
  const { colors } = useTheme();
  const {
    hiddenInputRef,
    isUnsupportedChain,
    sourceToken,
    sourceChainId,
    sourceTokenOptions,
    selectedSourceToken,
    isSourcePickerOpen,
    setIsSourcePickerOpen,
    setSelectedSourceToken,
    usdAmount,
    estimatedReceiveAmount,
    sourceBalanceFiat,
    formattedNetworkFee,
    formattedSlippage,
    formattedMinimumReceived,
    formattedPriceImpact,
    totalAmountUsd,
    isQuoteLoading,
    isTotalLoading,
    isHardwareSolanaBlocked,
    priceImpactViewData,
    isPriceImpactError,
    hasValidAmount,
    isConfirmDisabled,
    confirmButtonState,
    getButtonLabel,
    handlePresetPress,
    handleAmountAreaPress,
    handleAmountChange,
    handleConfirm,
  } = useQuickBuyBottomSheet(position, onClose);

  return (
    <>
      {isUnsupportedChain ? (
        <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.quick_buy.unsupported_chain')}
          </Text>
        </Box>
      ) : (
        <>
          <QuickBuyAmountInput
            usdAmount={usdAmount}
            position={position}
            estimatedReceiveAmount={estimatedReceiveAmount}
            isQuoteLoading={isQuoteLoading}
            hasValidAmount={hasValidAmount}
            hiddenInputRef={hiddenInputRef}
            onAmountAreaPress={handleAmountAreaPress}
            onAmountChange={handleAmountChange}
            colors={colors}
          />

          <QuickBuyBanners
            isHardwareSolanaBlocked={isHardwareSolanaBlocked}
            isPriceImpactError={isPriceImpactError}
            isPriceImpactWarning={
              !isPriceImpactError && !!priceImpactViewData.icon
            }
            formattedPriceImpact={formattedPriceImpact}
          />

          <QuickBuyFooter
            usdAmount={usdAmount}
            formattedNetworkFee={formattedNetworkFee}
            formattedSlippage={formattedSlippage}
            formattedMinimumReceived={formattedMinimumReceived}
            formattedPriceImpact={formattedPriceImpact}
            priceImpactViewData={priceImpactViewData}
            sourceToken={sourceToken}
            totalAmountUsd={totalAmountUsd}
            sourceChainId={sourceChainId}
            sourceTokenOptions={sourceTokenOptions}
            selectedSourceToken={selectedSourceToken}
            isSourcePickerOpen={isSourcePickerOpen}
            setIsSourcePickerOpen={setIsSourcePickerOpen}
            setSelectedSourceToken={setSelectedSourceToken}
            sourceBalanceFiat={sourceBalanceFiat}
            isTotalLoading={isTotalLoading}
            isConfirmDisabled={isConfirmDisabled}
            confirmButtonState={confirmButtonState}
            getButtonLabel={getButtonLabel}
            onPresetPress={handlePresetPress}
            onConfirm={handleConfirm}
            scrollAnimatedRef={scrollAnimatedRef}
            colors={colors}
          />
        </>
      )}
    </>
  );
};

/**
 * Lightweight shell — opens the sheet immediately with just a placeholder
 * so the animation runs on an idle JS thread. The heavy content tree is
 * mounted after the sheet reports its open animation has finished.
 */
const QuickBuyBottomSheetInner: React.FC<InnerProps> = ({
  position,
  marketCap,
  onClose,
}) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const scrollAnimatedRef = useAnimatedRef<GestureHandlerScrollView>();
  const [isContentReady, setIsContentReady] = useState(false);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet(() => {
      setIsContentReady(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      isInteractable={!isSubmittingTx}
      onClose={onClose}
    >
      <QuickBuyHeader
        position={position}
        marketCap={marketCap}
        onClose={handleClose}
      />
      {/*
       * The BottomSheet caps its dialog at `safe-area height`; without a
       * scroller, content beyond that cap is clipped (e.g. when both the
       * source-token picker and the Total fee breakdown are expanded).
       * `flexShrink: 1` lets this ScrollView size to its content normally,
       * but compress within the cap so its inner content scrolls instead of
       * overflowing the sheet.
       *
       * The footer drives `scrollTo` on this animated ref synchronously with
       * its height animations (UI thread), so the content visually grows
       * upward and the Buy button stays pinned during the transition without
       * the JS-thread lag a `scrollToEnd` from `onContentSizeChange` would
       * incur.
       */}
      <AnimatedScrollView
        ref={scrollAnimatedRef}
        style={tw.style('shrink')}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isContentReady ? (
          <QuickBuyBottomSheetContent
            position={position}
            onClose={onClose}
            scrollAnimatedRef={scrollAnimatedRef}
          />
        ) : (
          <QuickBuyBottomSheetSkeleton />
        )}
      </AnimatedScrollView>
    </BottomSheet>
  );
};

/**
 * Outer gate component — only mounts the inner sheet when visible.
 * This prevents the bridge hooks from running on an empty Redux state,
 * which causes reselect stability warnings.
 */
const QuickBuyBottomSheet: React.FC<QuickBuyBottomSheetProps> = ({
  isVisible,
  position,
  marketCap,
  onClose,
}) => {
  if (!isVisible || !position) return null;
  return (
    <QuickBuyBottomSheetInner
      position={position}
      marketCap={marketCap}
      onClose={onClose}
    />
  );
};

export default QuickBuyBottomSheet;
