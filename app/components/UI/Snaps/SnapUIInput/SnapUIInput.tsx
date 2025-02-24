import React, { useEffect, useRef, useState } from 'react';
import { useSnapInterfaceContext } from '../../../Snaps/SnapInterfaceContext';
import { TextInput } from 'react-native';
import TextField, { TextFieldSize } from '../../../../component-library/components/Form/TextField';

export interface SnapUIInputProps {
  name: string;
  form?: string;
}

export const SnapUIInput = ({ name, form, ...props }: SnapUIInputProps) => {
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
  );
};
