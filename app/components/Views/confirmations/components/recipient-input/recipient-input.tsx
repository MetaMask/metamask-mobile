import React, { useCallback, useRef, useMemo } from 'react';
import { TextInput } from 'react-native';
import {
  Box,
  Text,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import TextField from '../../../../../component-library/components/Form/TextField';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { useSendContext } from '../../context/send-context/send-context';
import { RecipientInputMethod } from '../../context/send-context/send-metrics-context';
import { useScanRecipientQrCode } from '../../hooks/send/useScanRecipientQrCode';

const ScanRecipientButton = ({ onPress }: { onPress: () => void }) => (
  <Box twClassName="h-[30px] items-center justify-center rounded-lg bg-muted px-1">
    <ButtonIcon
      iconName={IconName.ScanBarcode}
      size={ButtonIconSize.Sm}
      onPress={onPress}
      accessibilityLabel={strings('send.scan_qr_code')}
      testID="recipient-qr-scan-button"
    />
  </Box>
);

export const RecipientInput = ({
  isRecipientSelectedFromList,
  resetStateOnInput,
  setPastedRecipient,
  setAutoFilledInputMethod,
}: {
  isRecipientSelectedFromList: boolean;
  resetStateOnInput: () => void;
  setPastedRecipient: (recipient?: string) => void;
  setAutoFilledInputMethod?: (
    inputMethod:
      | typeof RecipientInputMethod.Pasted
      | typeof RecipientInputMethod.QrScan,
  ) => void;
}) => {
  const { to, updateTo } = useSendContext();
  const inputRef = useRef<TextInput>(null);

  const handleAddressScanned = useCallback(
    (scannedAddress: string) => {
      resetStateOnInput();
      updateTo(scannedAddress);
      setAutoFilledInputMethod?.(RecipientInputMethod.QrScan);
      setPastedRecipient(scannedAddress);
    },
    [resetStateOnInput, setAutoFilledInputMethod, setPastedRecipient, updateTo],
  );

  const { openScanner } = useScanRecipientQrCode({
    onAddressScanned: handleAddressScanned,
  });

  const handlePaste = useCallback(async () => {
    resetStateOnInput();
    try {
      const clipboardText = await ClipboardManager.getString();
      if (clipboardText) {
        const trimmedText = clipboardText.trim();
        updateTo(trimmedText);
        setAutoFilledInputMethod?.(RecipientInputMethod.Pasted);
        setPastedRecipient(trimmedText);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        return true;
      }
    } catch (error) {
      // Might consider showing an alert here if pasting fails
      // for now just ignore it
      // eslint-disable-next-line no-console
      console.log('error while pasting', error);
    }
  }, [
    updateTo,
    inputRef,
    setAutoFilledInputMethod,
    setPastedRecipient,
    resetStateOnInput,
  ]);

  const handleClearInput = useCallback(() => {
    updateTo('');
    setPastedRecipient(undefined);
    setTimeout(() => {
      inputRef.current?.blur();
    }, 100);
  }, [updateTo, inputRef, setPastedRecipient]);

  const handleTextChange = useCallback(
    async (toAddress: string) => {
      resetStateOnInput();
      updateTo(toAddress);
      setPastedRecipient(undefined);
    },
    [resetStateOnInput, setPastedRecipient, updateTo],
  );

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
      <Box twClassName="flex-row items-center gap-2.5">
        <ScanRecipientButton onPress={openScanner} />
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Sm}
          twClassName="-mr-2"
          onPress={handlePaste}
        >
          {strings('send.paste')}
        </Button>
      </Box>
    );
  }, [
    to,
    handleClearInput,
    handlePaste,
    isRecipientSelectedFromList,
    openScanner,
  ]);

  return (
    <Box twClassName="w-full px-4 py-2">
      <TextField
        ref={inputRef}
        endAccessory={renderEndAccessory}
        startAccessory={defaultStartAccessory}
        value={to}
        onChangeText={handleTextChange}
        autoCorrect={false}
        scrollEnabled={false}
        textAlignVertical="center"
        textBreakStrategy="simple"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="none"
        placeholder={strings('send.enter_address_to_send_to')}
        autoFocus={false}
        testID="recipient-address-input"
      />
    </Box>
  );
};
