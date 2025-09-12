import React, { FunctionComponent, useEffect, useState } from 'react';
import { ViewStyle } from 'react-native';
import { Box } from '../../UI/Box/Box';
import Label from '../../../component-library/components/Form/Label';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import RadioButton from '../../../component-library/components/RadioButton';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';

export interface SnapUIRadioGroupProps {
  name: string;
  options: { name: string; value: string; disabled?: boolean }[];
  label?: string;
  error?: string;
  form?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const SnapUIRadioGroup: FunctionComponent<SnapUIRadioGroupProps> = ({
  name,
  options,
  label,
  error,
  style,
  disabled,
  form,
}) => {
  const { handleInputChange, getValue } = useSnapInterfaceContext();

  const initialValue = getValue(name, form);

  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (
      initialValue !== null &&
      initialValue !== undefined &&
      value !== initialValue
    ) {
      setValue(initialValue);
    }
  }, [initialValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (newValue: string) => {
    setValue(newValue);
    handleInputChange(name, newValue, form);
  };

  return (
    <Box style={style} testID="snap-ui-renderer__radio">
      {label && <Label variant={TextVariant.BodyMDMedium}>{label}</Label>}
      {options.map((option) => (
        <RadioButton
          key={option.value}
          label={option.name}
          isChecked={value === option.value}
          isDisabled={disabled ?? option.disabled}
          onPress={() => handleChange(option.value)}
          testID="snap-ui-renderer__radio-button"
        />
      ))}
      {error && (
        // eslint-disable-next-line react-native/no-inline-styles
        <HelpText severity={HelpTextSeverity.Error} style={{ marginTop: 4 }}>
          {error}
        </HelpText>
      )}
    </Box>
  );
};
