import React, { useEffect, useRef, useState } from 'react';
import { useSnapInterfaceContext } from '../../../Snaps/SnapInterfaceContext';
import { FormTextField } from '../../FormTextField';
import { TextInput } from 'react-native';

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
    handleInputChange(name, text ?? null, form);
  };

  const handleFocus = () => setCurrentFocusedInput(name);
  const handleBlur = () => setCurrentFocusedInput(null);

  return (
    <FormTextField
      ref={inputRef}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="snap-ui-renderer__input"
      id={name}
      value={value}
      onChangeText={handleChange}
      {...props}
    />
  );
};
