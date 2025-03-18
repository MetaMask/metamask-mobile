import React, { useEffect, useRef, useState } from 'react';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { TextInput, ViewStyle } from 'react-native';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
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
}

export const SnapUIInput = ({
  name,
  form,
  label,
  error,
  style,
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

  const handleChange = (text: string) => {
    setValue(text);
    handleInputChange(name, text, form);
  };

  const handleFocus = () => setCurrentFocusedInput(name);
  const handleBlur = () => setCurrentFocusedInput(null);

  return (
    <Box style={style}>
      {label && <Label variant={TextVariant.BodyMDMedium}>{label}</Label>}
      <TextField
        {...props}
        size={TextFieldSize.Lg}
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        id={name}
        value={value}
        onChangeText={handleChange}
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
