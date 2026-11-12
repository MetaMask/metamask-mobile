import { getCardTitle } from '../CardDisplay/cardLabels';
import React, { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { CollectiblesCard } from '../../types';
import { formatPurchaseAmount } from '../PackPurchaseSheet/packPurchaseAmounts';
import CardImage from '../CardImage';
import CtaButton from '../CtaButton';
import { BuybackConfirmationTestIds } from './BuybackConfirmation.testIds';
import CollectiblesSheetModal from '../CollectiblesSheetModal/CollectiblesSheetModal';

export interface BuybackConfirmationProps {
  card: CollectiblesCard;
  /** Confirmed offer in USDC base units. */
  amount: string;
  isSelling: boolean;
  onConfirm: () => Promise<unknown> | void;
  onClose: () => void;
  confirmTestID?: string;
  isDisabled?: boolean;
}

/** Explicit approval of the card and offer before silent provider signing. */
const BuybackConfirmation = ({
  card,
  amount,
  isSelling,
  onConfirm,
  onClose,
  confirmTestID = BuybackConfirmationTestIds.CONFIRM_BUTTON,
  isDisabled = false,
}: BuybackConfirmationProps) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const isSubmitting = useRef(false);
  const received = formatPurchaseAmount(BigInt(amount));

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleClose = () => {
    if (!isSelling && !isSubmitting.current)
      sheetRef.current?.onCloseBottomSheet();
  };
  const handleConfirm = async () => {
    if (isSelling || isDisabled || isSubmitting.current) return;
    isSubmitting.current = true;
    try {
      await onConfirm();
    } finally {
      isSubmitting.current = false;
    }
  };

  return (
    <CollectiblesSheetModal onRequestClose={handleClose}>
      <BottomSheet
        ref={sheetRef}
        onClose={onClose}
        isInteractable={!isSelling}
        testID={BuybackConfirmationTestIds.CONTAINER}
      >
        <BottomSheetHeader
          onClose={handleClose}
          closeButtonProps={{ isDisabled: isSelling }}
        >
          {strings('collectibles.buyback_review.title')}
        </BottomSheetHeader>
        <ScrollView
          style={tw.style('grow-0 shrink')}
          showsVerticalScrollIndicator={false}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            paddingHorizontal={5}
            paddingBottom={5}
            gap={5}
          >
            <Box twClassName="w-16">
              <CardImage
                uri={card.image}
                previewUri={card.mediumImage}
                accessibilityLabel={getCardTitle(card)}
              />
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {getCardTitle(card)}
            </Text>
            <Box twClassName="items-center" gap={2}>
              <Text
                variant={TextVariant.AmountDisplayLg}
                testID="collectibles-buyback-amount"
              >
                {received}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('collectibles.reveal.buyback_offer')}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('collectibles.buyback_review.destination', {
                amount: received,
              })}
            </Text>
          </Box>
        </ScrollView>
        <Box paddingHorizontal={5} paddingTop={2} paddingBottom={4} gap={3}>
          <CtaButton
            label={strings('collectibles.haul.buyback', {
              amount: received,
            })}
            onPress={handleConfirm}
            isLoading={isSelling}
            isDisabled={isDisabled}
            loadingText={strings('collectibles.reveal.selling')}
            testID={confirmTestID}
          />
          <Button
            isFullWidth
            variant={ButtonVariant.Tertiary}
            isDisabled={isSelling}
            onPress={handleClose}
            testID="collectibles-buyback-dismiss"
          >
            {strings('collectibles.reveal.done')}
          </Button>
        </Box>
      </BottomSheet>
    </CollectiblesSheetModal>
  );
};

export default BuybackConfirmation;
