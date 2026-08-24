import React, { type RefObject } from 'react';
import { Text, TextInput, View, type DimensionValue } from 'react-native';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderShortAddress } from '../../../../../util/address';
import type { Colors } from '../../../../../util/theme/models';
import { AddContactViewSelectorsIDs } from '../AddContactView.testIds';
import type { ContactFormStyles } from './ContactForm.styles';

interface ContactFormFieldsProps {
  address: string | null;
  addressInputRef: RefObject<TextInput | null>;
  colors: Colors;
  editable: boolean;
  inputWidth: DimensionValue | undefined;
  isAddMode: boolean;
  isEditMode: boolean;
  memo: string | null;
  memoInputRef: RefObject<TextInput | null>;
  name: string | null;
  onChangeAddress: (address: string) => void;
  onChangeMemo: (memo: string) => void;
  onChangeName: (name: string) => void;
  onScan: () => void;
  styles: ContactFormStyles;
  themeAppearance: 'light' | 'dark';
  toEnsAddress: string | null;
  toEnsName: string | null | undefined;
}

export const ContactFormFields = ({
  address,
  addressInputRef,
  colors,
  editable,
  inputWidth,
  isAddMode,
  isEditMode,
  memo,
  memoInputRef,
  name,
  onChangeAddress,
  onChangeMemo,
  onChangeName,
  onScan,
  styles,
  themeAppearance,
  toEnsAddress,
  toEnsName,
}: ContactFormFieldsProps) => (
  <>
    <Text style={styles.label}>{strings('address_book.name')}</Text>
    <TextInput
      editable={editable}
      autoCapitalize="none"
      autoCorrect={false}
      onChangeText={onChangeName}
      placeholder={strings('address_book.nickname')}
      placeholderTextColor={colors.text.muted}
      spellCheck={false}
      numberOfLines={1}
      style={[
        styles.input,
        inputWidth ? { width: inputWidth } : {},
        editable ? {} : styles.textInputDisaled,
      ]}
      value={name ?? ''}
      onSubmitEditing={() => addressInputRef.current?.focus()}
      testID={AddContactViewSelectorsIDs.NAME_INPUT}
      keyboardAppearance={themeAppearance}
    />
    <Text style={styles.label}>{strings('address_book.address')}</Text>
    <View style={[styles.input, editable ? {} : styles.textInputDisaled]}>
      <View style={styles.inputWrapper}>
        <TextInput
          editable={isAddMode}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeAddress}
          placeholder={strings('address_book.add_input_placeholder')}
          placeholderTextColor={colors.text.muted}
          spellCheck={false}
          numberOfLines={1}
          style={[
            styles.textInput,
            inputWidth ? { width: inputWidth } : {},
            isEditMode ? { color: colors.text.alternative } : {},
          ]}
          value={toEnsName || address || ''}
          ref={addressInputRef}
          onSubmitEditing={() => memoInputRef.current?.focus()}
          testID={AddContactViewSelectorsIDs.ADDRESS_INPUT}
          keyboardAppearance={themeAppearance}
        />
        {toEnsName && toEnsAddress ? (
          <Text style={styles.resolvedInput}>
            {renderShortAddress(toEnsAddress)}
          </Text>
        ) : null}
      </View>
      {isAddMode ? (
        <View style={styles.iconWrapper}>
          <ButtonIcon
            iconName={IconName.ScanBarcode}
            size={ButtonIconSize.Sm}
            onPress={onScan}
            accessibilityLabel={strings('send.scan_qr_code')}
          />
        </View>
      ) : null}
    </View>
    <Text style={styles.label}>{strings('address_book.memo')}</Text>
    <View style={[styles.input, editable ? {} : styles.textInputDisaled]}>
      <View style={styles.inputWrapper}>
        <TextInput
          multiline
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeMemo}
          placeholder={strings('address_book.memo')}
          placeholderTextColor={colors.text.muted}
          spellCheck={false}
          numberOfLines={1}
          style={[styles.textInput, inputWidth ? { width: inputWidth } : {}]}
          value={memo ?? ''}
          ref={memoInputRef}
          testID={AddContactViewSelectorsIDs.MEMO_INPUT}
          keyboardAppearance={themeAppearance}
        />
      </View>
    </View>
  </>
);
