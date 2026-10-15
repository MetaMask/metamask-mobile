import React, { useCallback, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  ButtonsAlignment,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';

export interface MarketingConsentSheetProps {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  /** Saves the choice. A rejection keeps the sheet open with an error. */
  onConfirm: () => Promise<void>;
  onDismiss: () => void;
  testID: string;
}

/**
 * Confirms a marketing consent change that also affects the "Updates and
 * rewards" notifications. Render it only while it should be shown.
 */
const MarketingConsentSheet = ({
  title,
  description,
  confirmLabel,
  onConfirm,
  onDismiss,
  testID,
}: MarketingConsentSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const close = useCallback(() => {
    if (!sheetRef.current) {
      onDismiss();
      return;
    }
    sheetRef.current.onCloseBottomSheet(onDismiss);
  }, [onDismiss]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      close();
    }
  }, [close, isSubmitting]);

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    setHasError(false);
    try {
      await onConfirm();
    } catch {
      setIsSubmitting(false);
      setHasError(true);
      return;
    }
    setIsSubmitting(false);
    close();
  }, [close, onConfirm]);

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable={!isSubmitting}
      keyboardAvoidingViewEnabled={false}
      onClose={onDismiss}
      testID={testID}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: `${testID}-close` }}
      >
        {title}
      </BottomSheetHeader>
      <Box twClassName="px-4 pb-2 gap-4">
        {description}
        {hasError ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            testID={`${testID}-error`}
          >
            {strings('marketing_consent_sheet.error')}
          </Text>
        ) : null}
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        primaryButtonProps={{
          children: confirmLabel,
          onPress: handleConfirm,
          isLoading: isSubmitting,
          isDisabled: isSubmitting,
          size: ButtonSize.Lg,
          testID: `${testID}-confirm`,
        }}
        secondaryButtonProps={{
          children: strings('marketing_consent_sheet.cancel'),
          onPress: handleClose,
          isDisabled: isSubmitting,
          size: ButtonSize.Lg,
          testID: `${testID}-cancel`,
        }}
      />
    </BottomSheet>
  );
};

export default MarketingConsentSheet;
