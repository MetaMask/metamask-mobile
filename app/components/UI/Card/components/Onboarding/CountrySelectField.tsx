import React from 'react';
import { Box, IconSize, Spinner } from '@metamask/design-system-react-native';
import { countryCodeToFlag } from '../../util/countryCodeToFlag';
import type { Region } from '../../types';
import SelectField from './SelectField';
import CardFormField from './CardFormField';

interface CountrySelectFieldProps {
  label: string;
  selectedCountry: Region | null;
  /** Shown in TextAlternative when no country is selected. */
  placeholder?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
  testID: string;
  loadingTestID?: string;
  /** Neutral helper text under the field. */
  helpText?: React.ReactNode;
  helpTextTestID?: string;
}

const CountrySelectField = ({
  label,
  selectedCountry,
  placeholder,
  isLoading = false,
  isDisabled = false,
  onPress,
  testID,
  loadingTestID,
  helpText,
  helpTextTestID,
}: CountrySelectFieldProps) => {
  const flag = selectedCountry
    ? (selectedCountry.emoji ?? countryCodeToFlag(selectedCountry.key))
    : '';
  const spokenValue = selectedCountry?.name ?? placeholder;

  return (
    <CardFormField
      label={label}
      helpText={helpText}
      helpTextTestID={helpTextTestID}
    >
      {isLoading && !selectedCountry ? (
        <Box
          twClassName="flex-row items-center justify-center h-12 rounded-xl border border-solid border-muted bg-muted"
          testID={loadingTestID}
        >
          <Spinner spinnerIconProps={{ size: IconSize.Sm }} />
        </Box>
      ) : (
        <SelectField
          value={
            selectedCountry ? `${flag} ${selectedCountry.name}` : undefined
          }
          placeholder={placeholder}
          onPress={onPress}
          isDisabled={isDisabled || isLoading}
          testID={testID}
          accessibilityLabel={spokenValue ? `${label}, ${spokenValue}` : label}
        />
      )}
    </CardFormField>
  );
};

export default CountrySelectField;
