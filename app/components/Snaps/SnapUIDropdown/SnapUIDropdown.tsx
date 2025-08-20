import React, { FunctionComponent } from 'react';
import { ViewStyle } from 'react-native';
import { SnapUISelector } from '../SnapUISelector/SnapUISelector';
import { strings } from '../../../../locales/i18n';
import { SnapUICard } from '../SnapUICard/SnapUICard';

export interface SnapUIDropdownProps {
  name: string;
  options: { name: string; value: string; disabled?: boolean }[];
  label?: string;
  error?: string;
  form?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const SnapUIDropdown: FunctionComponent<SnapUIDropdownProps> = ({
  options,
  ...props
}) => {
  const formattedOptions = options.map((option) => ({
    value: option.value,
    disabled: option.disabled ?? false,
  }));

  const optionComponents = options.map((option, index) => (
    <SnapUICard key={index} title={option.name} value="" />
  ));

  return (
    <SnapUISelector
      title={strings('snap_ui.dropdown.title')}
      options={formattedOptions}
      optionComponents={optionComponents}
      testID="snap-ui-renderer__dropdown"
      {...props}
    />
  );
};
