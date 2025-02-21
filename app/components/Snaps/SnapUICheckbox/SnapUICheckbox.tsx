import React, { FunctionComponent, useEffect, useState } from 'react';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { BorderColor, Display, FlexDirection } from '../../UI/Box/box.types';
import Checkbox from '../../../component-library/components/Checkbox/Checkbox';
import { HelpTextSeverity } from '../../../component-library/components/Form/HelpText/HelpText.types';
import HelpText from '../../../component-library/components/Form/HelpText';
import Label from '../../../component-library/components/Form/Label';
import { Box } from '../../UI/Box/Box';

export type SnapUICheckboxProps = {
  name: string;
  fieldLabel?: string;
  // This variant is ignored on mobile.
  variant?: 'default' | 'toggle';
  label?: string;
  error?: string;
  form?: string;
  disabled?: boolean;
};

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
    <Box
      //className={classnames('snap-ui-renderer__checkbox', {
      //  'snap-ui-renderer__field': label !== undefined,
      // })}
      flexDirection={FlexDirection.Column}
    >
      {fieldLabel && <Label>{fieldLabel}</Label>}
        <Checkbox
          onPress={handleChange}
          isChecked={value}
          label={label}
          inputProps={{
            borderColor: BorderColor.borderMuted,
          }}
          isDisabled={disabled}
          {...props}
        />
      {error && (
        <HelpText severity={HelpTextSeverity.Error} style={{ marginTop: 1 }}>
          {error}
        </HelpText>
      )}
    </Box>
  );
};
