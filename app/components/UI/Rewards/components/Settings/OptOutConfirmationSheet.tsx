import React, { useState, useCallback } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import TextField from '../../../../../component-library/components/Form/TextField';
import RewardsErrorBanner from '../RewardsErrorBanner';

interface OptOutConfirmationSheetProps {
  isLoading?: boolean;
  errorMessage?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const OPT_OUT_CONFIRMATION_PHRASE = strings(
  'rewards.optout.modal.confirm_phrase',
);

const OptOutConfirmationSheet: React.FC<OptOutConfirmationSheetProps> = ({
  isLoading,
  errorMessage,
  onConfirm,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState('');

  const phraseMatches =
    inputValue.trim().toLowerCase() ===
    strings('rewards.optout.modal.confirm_phrase').toLowerCase();

  const handleConfirm = useCallback(() => {
    if (phraseMatches && !isLoading) {
      onConfirm();
    }
  }, [phraseMatches, isLoading, onConfirm]);

  return (
    <BottomSheet
      shouldNavigateBack={false}
      onClose={onClose}
      keyboardAvoidingViewEnabled={false}
    >
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <Box twClassName="px-4 pb-4">
          {/* Header: centered title + close button */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="mb-4"
          >
            <Box twClassName="w-10" />
            <Box
              twClassName="flex-1 items-center"
              justifyContent={BoxJustifyContent.Center}
            >
              <Text
                variant={TextVariant.HeadingSm}
                fontWeight={FontWeight.Bold}
                testID="opt-out-confirmation-title"
              >
                {strings('rewards.optout.modal.confirmation_title')}
              </Text>
            </Box>
            <ButtonIcon
              iconName={IconName.Close}
              iconProps={{ color: IconColor.IconDefault }}
              onPress={onClose}
              testID="opt-out-confirmation-close"
            />
          </Box>

          {/* Description */}
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-alternative text-center mb-6"
            testID="opt-out-confirmation-description"
          >
            {strings('rewards.optout.modal.confirmation_description')}
          </Text>

          {/* Type to confirm input */}
          <Box twClassName="mb-6 gap-2">
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-alternative"
              testID="opt-out-confirmation-input-label"
            >
              {strings('rewards.optout.modal.type_to_confirm')}
            </Text>
            <TextField
              testID="opt-out-confirmation-input"
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={strings('rewards.optout.modal.confirm_phrase')}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Box>

          {/* Error banner */}
          {errorMessage && (
            <Box twClassName="mb-4">
              <RewardsErrorBanner
                testID="opt-out-error-banner"
                title={strings('rewards.optout.modal.error_title')}
                description={errorMessage}
              />
            </Box>
          )}

          {/* Action buttons */}
          <Box twClassName="gap-2">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleConfirm}
              isDisabled={!phraseMatches || isLoading}
              isLoading={isLoading}
              isDanger
              twClassName="w-full"
              testID="opt-out-confirmation-confirm"
            >
              {strings('rewards.optout.modal.confirm')}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={onClose}
              isDisabled={isLoading}
              twClassName="w-full"
              testID="opt-out-confirmation-cancel"
            >
              {strings('rewards.optout.modal.cancel')}
            </Button>
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </BottomSheet>
  );
};

export default OptOutConfirmationSheet;
