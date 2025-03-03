import React, { FunctionComponent, useEffect, useState } from 'react';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { BorderColor, FlexDirection } from '../../UI/Box/box.types';
import Checkbox from '../../../component-library/components/Checkbox/Checkbox';
import { HelpTextSeverity } from '../../../component-library/components/Form/HelpText/HelpText.types';
import HelpText from '../../../component-library/components/Form/HelpText';
import Label from '../../../component-library/components/Form/Label';
import { Box } from '../../UI/Box/Box';
import { TextVariant } from '../../../component-library/components/Texts/Text';

export interface SnapUICheckboxProps {
  name: string;
  fieldLabel?: string;
  // This variant is ignored on mobile.
  variant?: 'default' | 'toggle';
  label?: string;
  error?: string;
  form?: string;
  disabled?: boolean;
}

export const SnapUICheckbox: FunctionComponent<SnapUICheckboxProps> = ({
  name,
  variant,
  fieldLabel,
  label,
  error,
  form,
  disabled,
  ...props
}) => {
  const { handleInputChange, getValue } = useSnapInterfaceContext();

  const initialValue = getValue(name, form) as boolean;

  const [value, setValue] = useState(initialValue ?? false);

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null) {
      setValue(initialValue);
    }
  }, [initialValue]);

  const handleChange = () => {
    setValue(!value);
    handleInputChange(name, !value, form);
  };

  return (
    <Box flexDirection={FlexDirection.Column}>
      {fieldLabel && (
        <Label variant={TextVariant.BodyMDMedium}>{fieldLabel}</Label>
      )}
      <Checkbox
        onPress={handleChange}
        isChecked={value}
        label={label}
        checkboxStyle={{
          borderColor: BorderColor.borderMuted,
        }}
        isDisabled={disabled}
        {...props}
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
