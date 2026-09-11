import React, { type RefObject } from 'react';
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
          isAddMode ? (
            <ButtonIcon
              iconName={IconName.ScanBarcode}
              size={ButtonIconSize.Sm}
              onPress={onScan}
              accessibilityLabel={strings('send.scan_qr_code')}
            />
          ) : undefined
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
