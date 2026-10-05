import React, { type RefObject } from 'react';
import { TextInput } from 'react-native';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Label,
  Text,
  TextArea,
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
  editable: boolean;
  isAddMode: boolean;
  isEditMode: boolean;
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
  editable,
  isAddMode,
  isEditMode,
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
  <Box twClassName="gap-4">
    <Box twClassName="gap-2">
      <Label>{strings('address_book.name')}</Label>
      <TextField
        value={name ?? ''}
        onChangeText={onChangeName}
        placeholder={strings('address_book.nickname')}
        isReadOnly={!editable}
        inputProps={{
          autoCapitalize: 'none',
          autoCorrect: false,
          spellCheck: false,
          numberOfLines: 1,
          returnKeyType: 'next',
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
        isReadOnly={!isAddMode}
        inputRef={addressInputRef}
        inputProps={{
          autoCapitalize: 'none',
          autoCorrect: false,
          spellCheck: false,
          numberOfLines: 1,
          returnKeyType: 'next',
          keyboardAppearance: themeAppearance,
          onSubmitEditing: () => memoInputRef.current?.focus(),
          testID: AddContactViewSelectorsIDs.ADDRESS_INPUT,
        }}
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
      />
      {isEditMode ? null : toEnsName && toEnsAddress ? (
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {renderShortAddress(toEnsAddress)}
        </Text>
      ) : null}
    </Box>
    <Box twClassName="gap-2">
      <Label>{strings('address_book.memo')}</Label>
      {/* TextArea rather than TextField: a memo accepts line breaks, and
          TextField forces multiline={false} on a fixed h-12. min-h-12 keeps
          the collapsed field aligned with the fields above while still
          growing with content. */}
      <TextArea
        value={memo ?? ''}
        onChangeText={onChangeMemo}
        placeholder={strings('address_book.memo')}
        isReadOnly={!editable}
        ref={memoInputRef}
        twClassName="min-h-12"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        keyboardAppearance={themeAppearance}
        testID={AddContactViewSelectorsIDs.MEMO_INPUT}
      />
    </Box>
  </Box>
);
