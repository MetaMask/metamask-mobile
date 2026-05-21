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
import Animated from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import { selectIsSubmittingTx } from '../../../../../../core/redux/slices/bridge';
import { useTheme } from '../../../../../../util/theme';
import QuickBuyAmountInput from './QuickBuyAmountInput';
import QuickBuyBanners from './QuickBuyBanners';
import QuickBuyBottomSheetSkeleton from './QuickBuyBottomSheetSkeleton';
import QuickBuyConfirmButton from './QuickBuyConfirmButton';
import QuickBuyFooter from './QuickBuyFooter';
import QuickBuyHeader from './QuickBuyHeader';
import { useQuickBuyBottomSheet } from './useQuickBuyBottomSheet';

export interface QuickBuyBottomSheetProps {
  isVisible: boolean;
  position: Position | null;
  onClose: () => void;
  /** Wallet address of the trader being copied; required for analytics. */
  traderAddress?: string;
  /** Destination-token market cap (in user currency); forwarded for analytics. */
  marketCap?: number;
  /** Surface that opened the sheet; forwarded for analytics. */
  source?: 'notification' | 'profile_position' | 'leaderboard';
}

interface InnerProps {
  position: Position;
  onClose: () => void;
  traderAddress?: string;
  marketCap?: number;
  source?: 'notification' | 'profile_position' | 'leaderboard';
}

const AnimatedScrollView = Animated.createAnimatedComponent(
  GestureHandlerScrollView,
);

/**
 * Heavy subtree — deferred until after the open animation so its hook
 * tree (bridge quotes, balances, rewards, metadata) does not starve the
 * JS thread while the sheet is animating in.
 */
const QuickBuyBottomSheetContent: React.FC<InnerProps> = ({
  position,
  onClose,
  traderAddress,
  marketCap,
  source,
}) => {
  const tw = useTailwind();
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
  } = useQuickBuyBottomSheet(position, onClose, {
    traderAddress,
    marketCap,
    source,
  });

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
          <AnimatedScrollView
            style={tw.style('shrink')}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
              onPresetPress={handlePresetPress}
              colors={colors}
            />
          </AnimatedScrollView>

          <Box twClassName="px-4 pt-3 pb-4 bg-default">
            <QuickBuyConfirmButton
              state={confirmButtonState}
              label={getButtonLabel()}
              isDisabled={isConfirmDisabled}
              onPress={handleConfirm}
              testID="quick-buy-confirm-button"
            />
          </Box>
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
  onClose,
  traderAddress,
  marketCap,
  source,
}) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
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
      {isContentReady ? (
        <QuickBuyBottomSheetContent
          position={position}
          onClose={onClose}
          traderAddress={traderAddress}
          marketCap={marketCap}
          source={source}
        />
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
 * Outer gate component — only mounts the inner sheet when visible.
 * This prevents the bridge hooks from running on an empty Redux state,
 * which causes reselect stability warnings.
 */
const QuickBuyBottomSheet: React.FC<QuickBuyBottomSheetProps> = ({
  isVisible,
  position,
  onClose,
  traderAddress,
  marketCap,
  source,
}) => {
  if (!isVisible || !position) return null;
  return (
    <QuickBuyBottomSheetInner
      position={position}
      onClose={onClose}
      traderAddress={traderAddress}
      marketCap={marketCap}
      source={source}
    />
  );
};

export default QuickBuyBottomSheet;
