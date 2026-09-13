import React, { useCallback, type RefObject } from 'react';
import { type TextInput } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
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
  toast,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderShortAddress } from '../../../../../util/address';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { AddContactViewSelectorsIDs } from '../AddContactView.testIds';
import { CommonSelectorsIDs } from '../../../../../util/Common.testIds';

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

const AddressCopyButton = ({ addressToCopy }: { addressToCopy: string }) => {
  const onCopy = useCallback(async () => {
    if (!addressToCopy) {
      return;
    }

    await ClipboardManager.setString(addressToCopy);
    toast({
      title: strings('notifications.address_copied_to_clipboard'),
      hasNoTimeout: false,
    });
  }, [addressToCopy]);

  if (!addressToCopy) {
    return null;
  }

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      isFullWidth
      onPress={onCopy}
      testID={AddContactViewSelectorsIDs.COPY_BUTTON}
    >
      {strings('wallet_creation_error.copy')}
    </Button>
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
      {editable ? (
        <TextField
          value={name ?? ''}
          onChangeText={onChangeName}
          placeholder={strings('address_book.nickname')}
          isReadOnly={!editable}
          inputProps={{
            autoCapitalize: 'none',
            autoCorrect: false,
            spellCheck: false,
            keyboardAppearance: themeAppearance,
            onSubmitEditing: () => addressInputRef.current?.focus(),
            testID: AddContactViewSelectorsIDs.NAME_INPUT,
          }}
        />
      ) : (
        <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
          {name}
        </Text>
      )}
    </Box>
    <Box twClassName="gap-2">
      <Label>{strings('address_book.address')}</Label>
      {isAddMode ? (
        <TextField
          value={toEnsName || address || ''}
          onChangeText={onChangeAddress}
          placeholder={strings('address_book.add_input_placeholder')}
          isReadOnly={!isAddMode}
          isError={Boolean(addressError)}
          inputRef={addressInputRef}
          endAccessory={
            <ButtonIcon
              iconName={IconName.ScanBarcode}
              size={ButtonIconSize.Sm}
              onPress={onScan}
              accessibilityLabel={strings('send.scan_qr_code')}
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
      ) : (
        <Box twClassName="gap-2">
          <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
            {address}
          </Text>
          <AddressCopyButton addressToCopy={toEnsAddress || address || ''} />
        </Box>
      )}
      {isAddMode && toEnsName && toEnsAddress ? (
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
      {editable ? (
        <TextArea
          ref={memoInputRef}
          value={memo ?? ''}
          onChangeText={onChangeMemo}
          placeholder={strings('address_book.memo')}
          isReadOnly={!editable}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardAppearance={themeAppearance}
          testID={AddContactViewSelectorsIDs.MEMO_INPUT}
        />
      ) : (
        <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
          {memo}
        </Text>
      )}
    </Box>
  </>
);
