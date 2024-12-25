import React, { useEffect, useRef, useState } from 'react';
import { useSnapInterfaceContext } from '../../../Approvals/Snaps/SnapUIRenderer/SnapInterfaceContext';
import { FormTextField } from '../../FormTextField';

export type SnapUIInputProps = {
  name: string;
  form?: string;
};

export const SnapUIInput = ({ name, form, ...props }: SnapUIInputProps) => {
  const { handleInputChange, getValue, focusedInput, setCurrentFocusedInput } =
    useSnapInterfaceContext();

  const inputRef = useRef<HTMLDivElement>(null);

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
    if (inputRef.current && name === focusedInput) {
      (inputRef.current.querySelector('input') as HTMLInputElement).focus();
    }
  }, [inputRef]);

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
