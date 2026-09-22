import React from 'react';
import {
  Box,
  Label,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import SelectField from '../../../components/Onboarding/SelectField';
import { countryCodeToFlag } from '../../../util/countryCodeToFlag';
import type { Region } from '../../../types';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';

interface SignInCountryFieldProps {
  selectedCountry: Region | null;
  isLocked: boolean;
  isLoading: boolean;
  onPress: () => void;
}

const SignInCountryField = ({
  selectedCountry,
  isLocked,
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
      isDisabled={isLocked || isLoading}
      testID={CardAuthenticationSelectors.COUNTRY_SELECT}
      endAccessory={
        isLocked ? (
          <Icon
            name={IconName.Lock}
            size={IconSize.Sm}
            twClassName="text-icon-muted"
          />
        ) : undefined
      }
    />
  </Box>
);

export default SignInCountryField;
