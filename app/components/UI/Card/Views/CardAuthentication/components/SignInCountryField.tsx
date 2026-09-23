import React from 'react';
import { Box, Label } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import SelectField from '../../../components/Onboarding/SelectField';
import { countryCodeToFlag } from '../../../util/countryCodeToFlag';
import type { Region } from '../../../types';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';

interface SignInCountryFieldProps {
  selectedCountry: Region | null;
  isLoading: boolean;
  onPress: () => void;
}

const SignInCountryField = ({
  selectedCountry,
  isLoading,
  onPress,
}: SignInCountryFieldProps) => (
  <Box>
    <Label>{strings('card.card_authentication.country_label')}</Label>
    <SelectField
      value={
        selectedCountry
          ? `${countryCodeToFlag(selectedCountry.key)} ${selectedCountry.name}`
          : undefined
      }
      onPress={onPress}
      isDisabled={isLoading}
      testID={CardAuthenticationSelectors.COUNTRY_SELECT}
    />
  </Box>
);

export default SignInCountryField;
