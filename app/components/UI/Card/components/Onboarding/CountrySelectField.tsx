import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Box, Label } from '@metamask/design-system-react-native';
import { countryCodeToFlag } from '../../util/countryCodeToFlag';
import type { Region } from '../../types';
import SelectField from './SelectField';

interface CountrySelectFieldProps {
  label: string;
  selectedCountry: Region | null;
  isLoading?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
  testID: string;
  loadingTestID?: string;
}

const CountrySelectField = ({
  label,
  selectedCountry,
  isLoading = false,
  isDisabled = false,
  onPress,
  testID,
  loadingTestID,
}: CountrySelectFieldProps) => {
  const flag = selectedCountry
    ? (selectedCountry.emoji ?? countryCodeToFlag(selectedCountry.key))
    : '';

  return (
    <Box>
      <Label>{label}</Label>
      {isLoading && !selectedCountry ? (
        <Box
          twClassName="flex-row items-center justify-center h-12 rounded-xl border border-solid border-border-muted bg-background-muted"
          testID={loadingTestID}
        >
          <ActivityIndicator size="small" />
        </Box>
      ) : (
        <SelectField
          value={
            selectedCountry ? `${flag} ${selectedCountry.name}` : undefined
          }
          onPress={onPress}
          isDisabled={isDisabled || isLoading}
          testID={testID}
        />
      )}
    </Box>
  );
};

export default CountrySelectField;
