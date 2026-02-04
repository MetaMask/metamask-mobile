import React, { useEffect, useRef, useState } from 'react';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { TextInput, ViewStyle, KeyboardTypeOptions } from 'react-native';
import TextField from '../../../component-library/components/Form/TextField';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import Label from '../../../component-library/components/Form/Label';
import { Box } from '../../UI/Box/Box';
import { TextVariant } from '../../../component-library/components/Texts/Text';

export interface SnapUIInputProps {
  name: string;
  form?: string;
  label?: string;
  error?: string;
  style?: ViewStyle;
  disabled?: boolean;
  keyboardType?: KeyboardTypeOptions;
  testID?: string;
}

export const SnapUIInput = ({
  name,
  form,
  label,
  error,
  style,
  disabled,
  keyboardType,
  testID,
  ...props
}: SnapUIInputProps) => {
  const { handleInputChange, getValue, focusedInput, setCurrentFocusedInput } =
    useSnapInterfaceContext();

  const inputRef = useRef<TextInput>(null);

  const initialValue = getValue(name, form) as string;

  const [value, setValue] = useState(initialValue ?? '');

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null) {
      setValue(initialValue);
    }
  }, [initialValue]);

  /*
   * Focus input if the last focused input was this input
   * This avoids loosing the focus when the UI is re-rendered
   */
  useEffect(() => {
    if (inputRef.current && focusedInput === name) {
      inputRef.current.focus();
    }
  }, [inputRef, name, focusedInput]);

  const getInputValue = (text: string) => {
    if (keyboardType === 'numeric') {
      // Mimic browser behaviour where commas are replaced.
      return text.replace(/,/g, '.');
    }

    return text;
  };

  const handleChange = (text: string) => {
    const textValue = getInputValue(text);

    setValue(textValue);
    handleInputChange(name, textValue, form);
  };

  const handleFocus = () => setCurrentFocusedInput(name);
  const handleBlur = () => setCurrentFocusedInput(null);

  return (
    <Box style={style}>
      {label && <Label variant={TextVariant.BodyMDMedium}>{label}</Label>}
      <TextField
        {...props}
        isDisabled={disabled}
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        id={name}
        testID={testID ?? `${name}-snap-ui-input`}
        value={value}
        onChangeText={handleChange}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        // We set a max height of 58px and let the input grow to fill the rest of the height next to a taller sibling element.
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ maxHeight: 58, flexGrow: 1 }}
      />
      {error && (
        // eslint-disable-next-line react-native/no-inline-styles
        <HelpText severity={HelpTextSeverity.Error} style={{ marginTop: 4 }}>
          {error}
        </HelpText>
      )}
    </Box>
  );
};
