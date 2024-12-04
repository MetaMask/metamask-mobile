import { StyleSheet, TextInput, View } from 'react-native';
import { FormTextFieldProps, FormTextFieldSize } from './form-text-field.types';
import Text from '../../../component-library/components/Texts/Text';

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
  inputRef,
  label,
  labelProps,
  startAccessory,
  maxLength,
  name,
  onBlur,
  onChange,
  onFocus,
  placeholder,
  readOnly,
  required,
  endAccessory,
  size = FormTextFieldSize.Md,
  textFieldProps,
  truncate,
  type = 'text',
  value,
  style,
  ...props
}: FormTextFieldProps) => {
  return (
    <View
      style={[
        styles.container,
        isDisabled || disabled ? styles.disabled : undefined,
        style,
      ]}
      ref={inputRef}
      {...props}
    >
      {label && (
        <Text style={[styles.label, labelProps?.style]} {...labelProps}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.textField,
          textFieldProps?.style,
          size === FormTextFieldSize.Sm && styles.smallTextField,
          size === FormTextFieldSize.Lg && styles.largeTextField,
        ]}
        editable={!disabled && !isDisabled && !readOnly}
        {...{
          autoComplete,
          autoFocus,
          defaultValue,
          maxLength,
          onBlur,
          onChange,
          onFocus,
          placeholder,
          value,
          ...inputProps,
          ...textFieldProps,
        }}
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
            error && styles.errorText,
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
    borderColor: '#D6D9DC',
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
    color: '#6A737D',
  },
  errorText: {
    color: '#D73A49',
  },
});
