import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  TextInputProps,
} from 'react-native';
import { FormTextFieldProps, FormTextFieldSize } from './form-text-field.types';
import Text from '../../../component-library/components/Texts/Text';
import { TextFieldProps } from '../../../component-library/components/Form/TextField/TextField.types';
import React from 'react';
import { useTheme } from '../../../../app/util/theme';

type MobileFormTextFieldProps = FormTextFieldProps & {
  ref?: React.RefObject<TextInput>;
  style?: StyleProp<TextStyle>;
  isDisabled?: boolean;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  value?: string;
  type?: string;
  truncate?: boolean;
  textFieldProps?: Omit<TextFieldProps, 'autoComplete'>;
  autoComplete?: TextInputProps['autoComplete'];
  defaultValue?: TextInputProps['defaultValue'];
  maxLength?: TextInputProps['maxLength'];
  placeholder?: TextInputProps['placeholder'];
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  textField: {
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 16,
  },
  smallTextField: {
    height: 32,
    fontSize: 14,
  },
  largeTextField: {
    height: 56,
    fontSize: 18,
  },
  accessoryContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
  startAccessory: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  endAccessory: {
    justifyContent: 'center',
    paddingRight: 12,
    marginLeft: 'auto',
  },
  helpText: {
    marginTop: 4,
    fontSize: 12,
  },
});

export const FormTextField = ({
  autoComplete,
  autoFocus,
  defaultValue,
  disabled,
  isDisabled,
  error,
  helpText,
  helpTextProps,
  id,
  inputProps,
  ref,
  label,
  labelProps,
  startAccessory,
  maxLength,
  name,
  onBlur,
  onChangeText,
  onFocus,
  placeholder,
  readOnly,
  required,
  endAccessory,
  size = FormTextFieldSize.Md,
  textFieldProps,
  truncate,
  value,
  style,
  ...props
}: MobileFormTextFieldProps) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        isDisabled || disabled ? styles.disabled : undefined,
        style,
      ]}
      ref={ref}
      {...props}
    >
      {label && (
        <Text style={[styles.label, labelProps?.style]} {...labelProps}>
          {label}
        </Text>
      )}
      <TextInput
        testID="form-text-field"
        {...inputProps}
        {...textFieldProps}
        style={[
          styles.textField,
          { borderColor: theme.brandColors.grey200 },
          textFieldProps?.style,
          size === FormTextFieldSize.Sm && styles.smallTextField,
          size === FormTextFieldSize.Lg && styles.largeTextField,
        ]}
        editable={!disabled && !isDisabled && !readOnly}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        defaultValue={defaultValue}
        maxLength={maxLength}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        value={value}
      />
      {(startAccessory || endAccessory) && (
        <View style={styles.accessoryContainer}>
          {startAccessory && (
            <View style={styles.startAccessory}>{startAccessory}</View>
          )}
          {endAccessory && (
            <View style={styles.endAccessory}>{endAccessory}</View>
          )}
        </View>
      )}
      {helpText && (
        <Text
          style={[
            styles.helpText,
            { color: theme.brandColors.grey500 },
            error && { color: theme.brandColors.red500 },
            helpTextProps?.style,
          ]}
          {...helpTextProps}
        >
          {helpText}
        </Text>
      )}
    </View>
  );
};
