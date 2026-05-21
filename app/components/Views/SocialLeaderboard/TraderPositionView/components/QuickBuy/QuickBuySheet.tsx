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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import { selectIsSubmittingTx } from '../../../../../../core/redux/slices/bridge';
import QuickBuyActionFooter from './components/QuickBuyActionFooter';
import QuickBuyAmountSection from './components/QuickBuyAmountSection';
import QuickBuyRateTag from './components/QuickBuyRateTag';
import QuickBuyToolbar from './components/QuickBuyToolbar';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
import { useQuickBuyController } from './hooks/useQuickBuyController';
import QuickBuyBottomSheetSkeleton from './QuickBuyBottomSheetSkeleton';
import type {
  QuickBuyFeatures,
  QuickBuySheetProps,
  QuickBuyTarget,
} from './types';

const AnimatedScrollView = Animated.createAnimatedComponent(
  GestureHandlerScrollView,
);

interface InnerProps {
  target: QuickBuyTarget;
  onClose: () => void;
  traderAddress?: string;
  marketCap?: number;
  source?: QuickBuySheetProps['source'];
  features: QuickBuyFeatures;
}

const QuickBuySheetContent: React.FC<InnerProps> = ({
  target,
  onClose,
  traderAddress,
  marketCap,
  source,
  features,
}) => {
  const {
    hiddenInputRef,
    isUnsupportedChain,
    sourceToken,
    sourceChainId,
    amountDisplayMode,
    usdAmount,
    sliderPercent,
    maxSpendUsd,
    formattedExchangeRate,
    metamaskFeePercent,
    estimatedReceiveAmount,
    sourceBalanceFiat,
    formattedPriceImpact,
    isQuoteLoading,
    isHardwareSolanaBlocked,
    priceImpactViewData,
    isPriceImpactError,
    hasValidAmount,
    isConfirmDisabled,
    confirmButtonState,
    getButtonLabel,
    handleSliderChange,
    handleAmountAreaPress,
    handleAmountChange,
    handleToggleAmountDisplay,
    handleConfirm,
  } = useQuickBuyController(target, onClose, {
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
          <QuickBuyToolbar
            sourceToken={sourceToken}
            sourceChainId={sourceChainId}
            payWithEnabled={features.payWithSheet}
          />

          <AnimatedScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <QuickBuyAmountSection
              amountDisplayMode={amountDisplayMode}
              fiatCryptoToggleEnabled={features.fiatCryptoToggle}
              usdAmount={usdAmount}
              destSymbol={target.tokenSymbol}
              estimatedReceiveAmount={estimatedReceiveAmount}
              availableBalanceFiat={sourceBalanceFiat}
              isQuoteLoading={isQuoteLoading}
              hasValidAmount={hasValidAmount}
              hiddenInputRef={hiddenInputRef}
              onAmountAreaPress={handleAmountAreaPress}
              onAmountChange={handleAmountChange}
              onToggleAmountDisplay={handleToggleAmountDisplay}
              rateTag={<QuickBuyRateTag label={formattedExchangeRate} />}
            />
          </AnimatedScrollView>

          <QuickBuyActionFooter
            sliderPercent={sliderPercent}
            maxSpendUsd={maxSpendUsd}
            onSliderChange={handleSliderChange}
            confirmButtonState={confirmButtonState}
            confirmLabel={getButtonLabel()}
            hasValidAmount={hasValidAmount}
            isConfirmDisabled={isConfirmDisabled}
            onConfirm={handleConfirm}
            metamaskFeePercent={metamaskFeePercent}
            isHardwareSolanaBlocked={isHardwareSolanaBlocked}
            isPriceImpactError={isPriceImpactError}
            isPriceImpactWarning={
              !isPriceImpactError && !!priceImpactViewData.icon
            }
            formattedPriceImpact={formattedPriceImpact}
          />
        </>
      )}
    </>
  );
};

const QuickBuySheetInner: React.FC<InnerProps> = (props) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isContentReady, setIsContentReady] = useState(false);
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
      onClose={props.onClose}
    >
      {isContentReady ? (
        <QuickBuySheetContent {...props} />
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
 * Modular Quick Buy bottom sheet — amount-first buy flow (Figma Swap For You).
 */
const QuickBuySheet: React.FC<QuickBuySheetProps> = ({
  isVisible,
  target,
  onClose,
  traderAddress,
  marketCap,
  source,
  features = TOP_TRADERS_QUICK_BUY_FEATURES,
}) => {
  if (!isVisible || !target) return null;

  return (
    <QuickBuySheetInner
      target={target}
      onClose={onClose}
      traderAddress={traderAddress}
      marketCap={marketCap}
      source={source}
      features={features}
    />
  );
};

export default QuickBuySheet;
