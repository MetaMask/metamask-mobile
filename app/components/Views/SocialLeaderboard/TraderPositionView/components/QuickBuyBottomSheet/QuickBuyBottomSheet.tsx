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
import QuickBuySubScreenHeader from './components/QuickBuySubScreenHeader';
import QuickBuyQuoteDetails from './screens/QuickBuyQuoteDetails';
import QuickBuySelectQuote from './screens/QuickBuySelectQuote';
import { useQuickBuyBottomSheet } from './useQuickBuyBottomSheet';

type QuickBuyScreen = 'amount' | 'details' | 'selectQuote';

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
  /** Close handler for the BottomSheet itself (animates close vs unmounting). */
  onSheetClose?: () => void;
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
  onSheetClose,
  traderAddress,
  marketCap,
  source,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [screen, setScreen] = useState<QuickBuyScreen>('amount');

  // Use animated sheet close when available (plays closing animation), fall
  // back to unmounting via onClose for the dismiss event.
  const handleClose = useCallback(() => {
    if (onSheetClose) {
      onSheetClose();
    } else {
      onClose();
    }
  }, [onSheetClose, onClose]);

  const goTo = useCallback((next: QuickBuyScreen) => setScreen(next), []);
  const goBack = useCallback(() => {
    setScreen((prev) =>
      prev === 'selectQuote' ? 'details' : prev === 'details' ? 'amount' : prev,
    );
  }, []);

  const {
    hiddenInputRef,
    isUnsupportedChain,
    sourceToken,
    sourceChainId,
    destToken,
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
    formattedMinimumReceivedFiat,
    formattedPriceImpact,
    formattedRate,
    isQuoteLoading,
    isTotalLoading,
    activeQuote,
    sortedQuotes,
    selectedQuoteRequestId,
    setSelectedQuoteRequestId,
    quotesLastFetchedAt,
    refreshCount,
    quoteRefreshRateMs,
    maxRefreshCount,
    refetchQuotes,
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

  const subScreenTitle =
    screen === 'selectQuote'
      ? strings('social_leaderboard.quick_buy.select_quote_title')
      : strings('social_leaderboard.quick_buy.quote_details_title');

  return (
    <>
      {isUnsupportedChain ? (
        <>
          <QuickBuyHeader
            position={position}
            marketCap={marketCap}
            onClose={handleClose}
            formattedRate={undefined}
            isRateLoading={false}
            onRatePress={() => undefined}
          />
          <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.quick_buy.unsupported_chain')}
            </Text>
          </Box>
        </>
      ) : (
        <>
          {screen === 'amount' && (
            <QuickBuyHeader
              position={position}
              marketCap={marketCap}
              onClose={handleClose}
              formattedRate={formattedRate}
              isRateLoading={isQuoteLoading && hasValidAmount}
              onRatePress={() => goTo('details')}
            />
          )}
          {screen !== 'amount' && (
            <QuickBuySubScreenHeader
              title={subScreenTitle}
              onBack={goBack}
              onClose={handleClose}
            />
          )}

          {screen === 'amount' && (
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
                  sourceToken={sourceToken}
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

          {screen === 'details' && (
            <AnimatedScrollView
              style={tw.style('shrink')}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <QuickBuyQuoteDetails
                activeQuote={activeQuote}
                sourceToken={sourceToken}
                destToken={destToken}
                formattedNetworkFee={formattedNetworkFee}
                formattedSlippage={formattedSlippage}
                formattedMinimumReceived={formattedMinimumReceived}
                formattedMinimumReceivedFiat={formattedMinimumReceivedFiat}
                formattedRate={formattedRate}
                quotesLastFetchedAt={quotesLastFetchedAt}
                refreshCount={refreshCount}
                quoteRefreshRateMs={quoteRefreshRateMs}
                maxRefreshCount={maxRefreshCount}
                refetchQuotes={refetchQuotes}
                onRatePress={() => goTo('selectQuote')}
              />
            </AnimatedScrollView>
          )}

          {screen === 'selectQuote' && (
            <AnimatedScrollView
              style={tw.style('shrink')}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <QuickBuySelectQuote
                sortedQuotes={sortedQuotes}
                selectedQuoteRequestId={selectedQuoteRequestId}
                isLoading={isQuoteLoading}
                onSelectQuote={(requestId: string) => {
                  setSelectedQuoteRequestId(requestId);
                  goBack();
                }}
              />
            </AnimatedScrollView>
          )}
        </>
      )}
    </>
  );
};

/**
 * Lightweight shell — opens the sheet immediately with just a placeholder
 * so the animation runs on an idle JS thread. The heavy content tree is
 * mounted after the sheet reports its open animation has finished.
 *
 * Note: QuickBuyHeader is rendered INSIDE QuickBuyBottomSheetContent (once
 * content is ready) so that the rate-tag pill has access to live hook data.
 * During skeleton loading we render a simpler header without the rate pill.
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
      {!isContentReady && (
        <>
          <QuickBuyHeader
            position={position}
            marketCap={marketCap}
            onClose={handleClose}
            formattedRate={undefined}
            isRateLoading={false}
            onRatePress={() => undefined}
          />
          <AnimatedScrollView
            style={tw.style('shrink')}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <QuickBuyBottomSheetSkeleton />
          </AnimatedScrollView>
        </>
      )}
      {isContentReady && (
        <QuickBuyBottomSheetContent
          position={position}
          onClose={onClose}
          traderAddress={traderAddress}
          marketCap={marketCap}
          source={source}
          onSheetClose={handleClose}
        />
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
