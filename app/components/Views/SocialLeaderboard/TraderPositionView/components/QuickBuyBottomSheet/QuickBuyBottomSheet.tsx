import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import BottomSheet from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import { useQuickBuyBottomSheet } from './useQuickBuyBottomSheet';
import { useQuickBuyPay } from './useQuickBuyPay';
import { QuickBuyTransactionProvider } from './QuickBuyTransactionProvider';
import QuickBuyHeader from './QuickBuyHeader';
import QuickBuyAmountInput from './QuickBuyAmountInput';
import QuickBuyFooter from './QuickBuyFooter';
import type { Hex } from '@metamask/utils';

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
 * Renders the content of the bottom sheet. Runs inside
 * `QuickBuyTransactionProvider` so all Pay hooks resolve against the
 * newly-created `quickBuy` transaction.
 */
const QuickBuyBottomSheetContent: React.FC<
  InnerProps & {
    transactionId: string | undefined;
    destChainId: Hex | undefined;
    destTokenAddress: Hex | undefined;
    destTokenImage: string | undefined;
    usdAmount: string;
    hiddenInputRef: React.RefObject<import('react-native').TextInput>;
    bottomSheetRef: React.RefObject<
      import('../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types').BottomSheetRef
    >;
    isUnsupportedChain: boolean;
    markConfirmed: () => void;
    handlePresetPress: (preset: string) => void;
    handleAmountAreaPress: () => void;
    handleAmountChange: (text: string) => void;
    handleClose: () => void;
  }
> = ({
  position,
  onClose,
  transactionId,
  destChainId,
  destTokenAddress,
  destTokenImage,
  usdAmount,
  hiddenInputRef,
  bottomSheetRef,
  isUnsupportedChain,
  markConfirmed,
  handlePresetPress,
  handleAmountAreaPress,
  handleAmountChange,
  handleClose,
}) => {
  const { colors } = useTheme();

  const {
    isQuoteLoading,
    hasValidAmount,
    isConfirmDisabled,
    isConfirmLoading,
    getButtonLabel,
    totalPayUsd,
    targetAmountUsd,
    handleConfirm,
  } = useQuickBuyPay({
    transactionId,
    usdAmount,
    destTokenAddress,
    destChainId,
    onClose,
    markConfirmed,
  });

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      isInteractable={!isConfirmLoading}
      onClose={handleClose}
    >
      <QuickBuyHeader
        position={position}
        destTokenImage={destTokenImage}
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
            targetAmountUsd={targetAmountUsd}
            isQuoteLoading={isQuoteLoading}
            hasValidAmount={hasValidAmount}
            hiddenInputRef={hiddenInputRef}
            onAmountAreaPress={handleAmountAreaPress}
            onAmountChange={handleAmountChange}
            colors={colors}
          />

          <QuickBuyFooter
            usdAmount={usdAmount}
            totalPayUsd={totalPayUsd}
            isConfirmDisabled={isConfirmDisabled}
            isConfirmLoading={isConfirmLoading}
            getButtonLabel={getButtonLabel}
            onPresetPress={handlePresetPress}
            onConfirm={handleConfirm}
            colors={colors}
          />
        </>
      )}
    </BottomSheet>
  );
};

/**
 * Outer component: creates the Pay transaction for this position and provides
 * the transactionId context to the Pay-driven inner tree.
 */
const QuickBuyBottomSheetInner: React.FC<InnerProps> = ({
  position,
  onClose,
}) => {
  const {
    bottomSheetRef,
    hiddenInputRef,
    transactionId,
    destChainId,
    destToken,
    isUnsupportedChain,
    usdAmount,
    markConfirmed,
    handleClose,
    handlePresetPress,
    handleAmountAreaPress,
    handleAmountChange,
  } = useQuickBuyBottomSheet(position, onClose);

  const destChainHex =
    typeof destChainId === 'string' && destChainId.startsWith('0x')
      ? (destChainId as Hex)
      : undefined;

  return (
    <QuickBuyTransactionProvider transactionId={transactionId}>
      <QuickBuyBottomSheetContent
        position={position}
        onClose={onClose}
        transactionId={transactionId}
        destChainId={destChainHex}
        destTokenAddress={destToken?.address as Hex | undefined}
        destTokenImage={destToken?.image}
        usdAmount={usdAmount}
        hiddenInputRef={hiddenInputRef}
        bottomSheetRef={bottomSheetRef}
        isUnsupportedChain={isUnsupportedChain}
        markConfirmed={markConfirmed}
        handlePresetPress={handlePresetPress}
        handleAmountAreaPress={handleAmountAreaPress}
        handleAmountChange={handleAmountChange}
        handleClose={handleClose}
      />
    </QuickBuyTransactionProvider>
  );
};

/**
 * Outer gate — only mounts the inner sheet when visible so the transaction
 * lifecycle only runs while the sheet is on screen.
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
