import React, { useState, useCallback, memo } from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useOptout } from '../../hooks/useOptout';
import OptOutConfirmationSheet from './OptOutConfirmationSheet';

const OptOutSection: React.FC = () => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const { optout, isLoading } = useOptout();

  const handleErasePress = useCallback(() => {
    setErrorMessage(undefined);
    setIsSheetOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsSheetOpen(false);
    setErrorMessage(undefined);
  }, []);

  const handleConfirm = useCallback(async () => {
    setErrorMessage(undefined);
    const success = await optout();
    if (success) {
      setIsSheetOpen(false);
    } else {
      setErrorMessage(strings('rewards.optout.modal.error_message'));
    }
  }, [optout]);

  return (
    <>
      {/* Divider */}
      <Box twClassName="mt-4 border-b border-border-muted" />

      <Box testID="opt-out-section" twClassName="gap-4 flex-col p-4">
        <Box twClassName="gap-2">
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.optout.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-alternative"
            testID="opt-out-section-description"
          >
            {strings('rewards.optout.description')}
          </Text>
        </Box>

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleErasePress}
          isDanger
          twClassName="w-full"
          testID="opt-out-erase-button"
        >
          {strings('rewards.optout.erase_button')}
        </Button>
      </Box>

      {isSheetOpen && (
        <OptOutConfirmationSheet
          isLoading={isLoading}
          errorMessage={errorMessage}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default memo(OptOutSection);
