import { useMemo } from 'react';
import {
  AsYouType,
  getCountryCallingCode,
  parseDigits,
  CountryCode,
} from 'libphonenumber-js/core';
import minMetadata from 'libphonenumber-js/min/metadata';

const usePhoneNumberFormatter = (country: CountryCode = 'US') =>
  useMemo(
    () => ({
      formatAsYouType: (input: string) => {
        if (!input) return '';

        try {
          const asYouType = new AsYouType(country, minMetadata);
          asYouType.input(input);
          const phoneNumber = asYouType.getNumber();

          if (phoneNumber) {
            return phoneNumber.format('NATIONAL');
          }

          return asYouType.getNumberValue() || input;
        } catch (error) {
          return input;
        }
      },

      formatE164: (input: string) => {
        if (!input) return '';

        try {
          const asYouType = new AsYouType(country, minMetadata);
          asYouType.input(input);
          const phoneNumber = asYouType.getNumber();

          if (phoneNumber) {
            return phoneNumber.format('E.164');
          }

          const digits = parseDigits(input);
          if (digits) {
            const countryCode = getCountryCallingCode(country, minMetadata);
            return `+${countryCode}${digits}`;
          }

          return input;
        } catch (error) {
          return input;
        }
      },
    }),
    [country],
  );

export default usePhoneNumberFormatter;
