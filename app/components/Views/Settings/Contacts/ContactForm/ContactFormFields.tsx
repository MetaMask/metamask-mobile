import React, { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { type TextInput } from 'react-native';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  HelpText,
  HelpTextSeverity,
  IconName,
  Label,
  Text,
  TextArea,
  TextButton,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderShortAddress } from '../../../../../util/address';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { AddContactViewSelectorsIDs } from '../AddContactView.testIds';
import { CommonSelectorsIDs } from '../../../../../util/Common.testIds';

const COPIED_ICON_RESET_MS = 3000;

interface ContactFormFieldsProps {
  address: string | null;
  /** Resolved, user-facing validation message for the address field. */
  addressError: string | null;
  addressInputRef: RefObject<TextInput | null>;
  editable: boolean;
  /** Lets the user save despite the address error (contract address case). */
  errorContinue: boolean;
  isAddMode: boolean;
  memo: string | null;
  memoInputRef: RefObject<TextInput | null>;
  name: string | null;
  onChangeAddress: (address: string) => void;
  onChangeMemo: (memo: string) => void;
  onChangeName: (name: string) => void;
  onErrorContinue: () => void;
  onScan: () => void;
  themeAppearance: 'light' | 'dark';
  toEnsAddress: string | null;
  toEnsName: string | null | undefined;
}

const AddressFieldEndAccessory = ({
  addressToCopy,
  isAddMode,
  onScan,
}: {
  addressToCopy: string;
  isAddMode: boolean;
  onScan: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    },
    [],
  );

  const onCopy = useCallback(async () => {
    if (!addressToCopy) {
      return;
    }

    await ClipboardManager.setString(addressToCopy);
    setCopied(true);

    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, COPIED_ICON_RESET_MS);
  }, [addressToCopy]);

  if (isAddMode) {
    return (
      <ButtonIcon
        iconName={IconName.ScanBarcode}
        size={ButtonIconSize.Sm}
        onPress={onScan}
        accessibilityLabel={strings('send.scan_qr_code')}
      />
    );
  }

  if (!addressToCopy) {
    return null;
  }

  return (
    <ButtonIcon
      iconName={copied ? IconName.CopySuccess : IconName.Copy}
      size={ButtonIconSize.Sm}
      onPress={onCopy}
      accessibilityLabel={
        copied
          ? strings('transactions.address_copied_to_clipboard')
          : strings('wallet_creation_error.copy')
      }
      testID={AddContactViewSelectorsIDs.COPY_BUTTON}
    />
  );
};

export const ContactFormFields = ({
  address,
  addressError,
  addressInputRef,
  editable,
  errorContinue,
  isAddMode,
  memo,
  memoInputRef,
  name,
  onChangeAddress,
  onChangeMemo,
  onChangeName,
  onErrorContinue,
  onScan,
  themeAppearance,
  toEnsAddress,
  toEnsName,
}: ContactFormFieldsProps) => (
  <>
    <Box twClassName="gap-2">
      <Label>{strings('address_book.name')}</Label>
      <TextField
        value={name ?? ''}
        onChangeText={onChangeName}
        placeholder={strings('address_book.nickname')}
        isDisabled={!editable}
        inputProps={{
          autoCapitalize: 'none',
          autoCorrect: false,
          spellCheck: false,
          keyboardAppearance: themeAppearance,
          onSubmitEditing: () => addressInputRef.current?.focus(),
          testID: AddContactViewSelectorsIDs.NAME_INPUT,
        }}
      />
    </Box>
    <Box twClassName="gap-2">
      <Label>{strings('address_book.address')}</Label>
      <TextField
        value={toEnsName || address || ''}
        onChangeText={onChangeAddress}
        placeholder={strings('address_book.add_input_placeholder')}
        isDisabled={!isAddMode}
        isError={Boolean(addressError)}
        inputRef={addressInputRef}
        endAccessory={
          <AddressFieldEndAccessory
            addressToCopy={toEnsAddress || address || ''}
            isAddMode={isAddMode}
            onScan={onScan}
          />
        }
        inputProps={{
          autoCapitalize: 'none',
          autoCorrect: false,
          spellCheck: false,
          keyboardAppearance: themeAppearance,
          onSubmitEditing: () => memoInputRef.current?.focus(),
          testID: AddContactViewSelectorsIDs.ADDRESS_INPUT,
        }}
      />
      {toEnsName && toEnsAddress ? (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {renderShortAddress(toEnsAddress)}
        </Text>
      ) : null}
      {addressError ? (
        <HelpText
          severity={HelpTextSeverity.Danger}
          testID={CommonSelectorsIDs.ERROR_MESSAGE}
        >
          {addressError}
        </HelpText>
      ) : null}
      {addressError && errorContinue ? (
        <TextButton onPress={onErrorContinue}>
          {strings('transaction.continueError')}
        </TextButton>
      ) : null}
    </Box>
    <Box twClassName="gap-2">
      <Label>{strings('address_book.memo')}</Label>
      <TextArea
        ref={memoInputRef}
        value={memo ?? ''}
        onChangeText={onChangeMemo}
        placeholder={strings('address_book.memo')}
        isDisabled={!editable}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        keyboardAppearance={themeAppearance}
        testID={AddContactViewSelectorsIDs.MEMO_INPUT}
      />
    </Box>
  </>
);
