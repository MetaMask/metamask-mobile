import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import BottomSheet from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import type { BottomSheetRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import { selectIsSubmittingTx } from '../../../../../../core/redux/slices/bridge';
import { useQuickBuyBottomSheet } from './useQuickBuyBottomSheet';
import QuickBuyHeader from './QuickBuyHeader';
import QuickBuyAmountInput from './QuickBuyAmountInput';
import QuickBuyFooter from './QuickBuyFooter';

export interface QuickBuyBottomSheetProps {
  isVisible: boolean;
  position: Position | null;
  onClose: () => void;
}

interface InnerProps {
  position: Position;
  onClose: () => void;
}

/**
 * Heavy subtree — deferred until after the open animation so its hook
 * tree (bridge quotes, balances, rewards, metadata) does not starve the
 * JS thread while the sheet is animating in.
 */
const QuickBuyBottomSheetContent: React.FC<InnerProps> = ({
  position,
  onClose,
}) => {
  const { colors } = useTheme();
  const {
    hiddenInputRef,
    destToken,
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
    isQuoteLoading,
    estimatedPoints,
    isRewardsLoading,
    shouldShowLiveRewardsEstimate,
    shouldShowRewardsOptInCta,
    shouldShowRewardsFallbackZero,
    hasRewardsError,
    rewardsAccountScope,
    hasError,
    hasValidAmount,
    isConfirmDisabled,
    isConfirmLoading,
    getButtonLabel,
    handleClose,
    handlePresetPress,
    handleAmountAreaPress,
    handleAmountChange,
    handleConfirm,
  } = useQuickBuyBottomSheet(position, onClose);

  return (
    <>
      <QuickBuyHeader
        position={position}
        destToken={destToken}
        onClose={handleClose}
      />

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
            hasError={hasError}
            hiddenInputRef={hiddenInputRef}
            onAmountAreaPress={handleAmountAreaPress}
            onAmountChange={handleAmountChange}
            colors={colors}
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
            estimatedPoints={estimatedPoints}
            isRewardsLoading={isRewardsLoading}
            shouldShowLiveRewardsEstimate={shouldShowLiveRewardsEstimate}
            shouldShowRewardsOptInCta={shouldShowRewardsOptInCta}
            shouldShowRewardsFallbackZero={shouldShowRewardsFallbackZero}
            hasRewardsError={hasRewardsError}
            rewardsAccountScope={rewardsAccountScope}
            isConfirmDisabled={isConfirmDisabled}
            isConfirmLoading={isConfirmLoading}
            getButtonLabel={getButtonLabel}
            onPresetPress={handlePresetPress}
            onConfirm={handleConfirm}
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
 * mounted via InteractionManager once the animation has finished.
 */
const QuickBuyBottomSheetInner: React.FC<InnerProps> = ({
  position,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isContentReady, setIsContentReady] = useState(false);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
    const handle = InteractionManager.runAfterInteractions(() => {
      setIsContentReady(true);
    });
    return () => {
      handle?.cancel?.();
    };
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      isInteractable={!isSubmittingTx}
      onClose={onClose}
    >
      {isContentReady ? (
        <QuickBuyBottomSheetContent position={position} onClose={onClose} />
      ) : (
        <>
          <QuickBuyHeader
            position={position}
            destToken={undefined}
            onClose={onClose}
          />
          <Box
            twClassName="py-20"
            alignItems={BoxAlignItems.Center}
            testID="quick-buy-content-loading"
          >
            <ActivityIndicator />
          </Box>
        </>
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
}) => {
  if (!isVisible || !position) return null;
  return <QuickBuyBottomSheetInner position={position} onClose={onClose} />;
};

export default QuickBuyBottomSheet;
