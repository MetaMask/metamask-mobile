import React, { type RefObject } from 'react';
import { type TextInput } from 'react-native';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Label,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderShortAddress } from '../../../../../util/address';
import { AddContactViewSelectorsIDs } from '../AddContactView.testIds';

interface ContactFormFieldsProps {
  address: string | null;
  addressInputRef: RefObject<TextInput | null>;
  /**
   * When true, the address TextField should render in error state.
   */
  addressIsError?: boolean;
  editable: boolean;
  isAddMode: boolean;
  memo: string | null;
  memoInputRef: RefObject<TextInput | null>;
  name: string | null;
  onChangeAddress: (address: string) => void;
  onChangeMemo: (memo: string) => void;
  onChangeName: (name: string) => void;
  onScan: () => void;
  themeAppearance: 'light' | 'dark';
  toEnsAddress: string | null;
  toEnsName: string | null | undefined;
}

export const ContactFormFields = ({
  address,
  addressInputRef,
  addressIsError = false,
  editable,
  isAddMode,
  memo,
  memoInputRef,
  name,
  onChangeAddress,
  onChangeMemo,
  onChangeName,
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
        isError={addressIsError}
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
    </Box>
    <Box twClassName="gap-2">
      <Label>{strings('address_book.memo')}</Label>
      <TextField
        value={memo ?? ''}
        onChangeText={onChangeMemo}
        placeholder={strings('address_book.memo')}
        isDisabled={!editable}
        inputRef={memoInputRef}
        inputProps={{
          autoCapitalize: 'none',
          autoCorrect: false,
          spellCheck: false,
          keyboardAppearance: themeAppearance,
          testID: AddContactViewSelectorsIDs.MEMO_INPUT,
        }}
      />
    </Box>
  </>
);
