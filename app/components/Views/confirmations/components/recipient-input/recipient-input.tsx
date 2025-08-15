import React, { useCallback, useRef, useMemo } from 'react';
import { TextInput } from 'react-native';
import {
  Box,
  Text,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  TextColor,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import TextField from '../../../../../component-library/components/Form/TextField';
import { TextFieldSize } from '../../../../../component-library/components/Form/TextField/TextField.types';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { useToAddressValidation } from '../../hooks/send/useToAddressValidation';
import { useRecipientSelectionMetrics } from '../../hooks/send/metrics/useRecipientSelectionMetrics';
import { useSendActions } from '../../hooks/send/useSendActions';
import { useSendContext } from '../../context/send-context/send-context';

export const RecipientInput = ({
  isRecipientSelectedFromList,
}: {
  isRecipientSelectedFromList: boolean;
}) => {
  const { to, updateTo } = useSendContext();
  const inputRef = useRef<TextInput>(null);
  const { validateToAddress } = useToAddressValidation();
  const { setRecipientInputMethodPasted, captureRecipientSelected } =
    useRecipientSelectionMetrics();
  const { handleSubmitPress } = useSendActions();

  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await ClipboardManager.getString();
      if (clipboardText) {
        const trimmedText = clipboardText.trim();
        const { error } = await validateToAddress(trimmedText);
        if (!error) {
          setRecipientInputMethodPasted();
          captureRecipientSelected();
          handleSubmitPress(clipboardText);
          return;
        }
        updateTo(trimmedText);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      // Might consider showing an alert here if pasting fails
      // for now just ignore it
    }
  }, [
    updateTo,
    inputRef,
    validateToAddress,
    setRecipientInputMethodPasted,
    captureRecipientSelected,
    handleSubmitPress,
  ]);

  const handleClearInput = useCallback(() => {
    updateTo('');
    setTimeout(() => {
      inputRef.current?.blur();
    }, 100);
  }, [updateTo, inputRef]);

  const defaultStartAccessory = useMemo(
    () => <Text color={TextColor.TextAlternative}>{strings('send.to')}</Text>,
    [],
  );

  const renderEndAccessory = useMemo(() => {
    if (to && to.length > 0 && !isRecipientSelectedFromList) {
      return (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Sm}
          twClassName="-mr-2"
          onPress={handleClearInput}
        >
          {strings('send.clear')}
        </Button>
      );
    }
    return (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonBaseSize.Sm}
        twClassName="-mr-2"
        onPress={handlePaste}
      >
        {strings('send.paste')}
      </Button>
    );
  }, [to, handleClearInput, handlePaste, isRecipientSelectedFromList]);

  return (
    <Box twClassName="w-full px-4 py-2">
      <TextField
        autoCorrect={false}
        ref={inputRef}
        value={isRecipientSelectedFromList ? '' : to}
        onChangeText={updateTo}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="none"
        placeholder={strings('send.enter_address_to_send_to')}
        size={TextFieldSize.Lg}
        endAccessory={renderEndAccessory}
        startAccessory={defaultStartAccessory}
        autoFocus={false}
      />
    </Box>
  );
};
