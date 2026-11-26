// PROTOTYPE-DO-NOT-MERGE
import type { Country } from '@metamask/ramps-controller';

type PrototypePhoneCountry = Pick<
  Country,
  'isoCode' | 'flag' | 'name' | 'phone'
>;

/**
 * The phone countries the prototype offers, in the shape the Ramp phone
 * country sheet and formatter read (`phone.prefix`, `phone.template`,
 * `phone.placeholder`). The real flow would take these from the regions API,
 * as Ramp does; the prototype has no API, so a short fixed list stands in.
 */
const PHONE_COUNTRIES: PrototypePhoneCountry[] = [
  {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phone: {
      prefix: '+1',
      template: '(XXX) XXX-XXXX',
      placeholder: '(555) 123-4567',
    },
  },
  {
    isoCode: 'CA',
    flag: '🇨🇦',
    name: 'Canada',
    phone: {
      prefix: '+1',
      template: '(XXX) XXX-XXXX',
      placeholder: '(555) 123-4567',
    },
  },
  {
    isoCode: 'GB',
    flag: '🇬🇧',
    name: 'United Kingdom',
    phone: {
      prefix: '+44',
      template: 'XXXX XXXXXX',
      placeholder: '7400 123456',
    },
  },
  {
    isoCode: 'IE',
    flag: '🇮🇪',
    name: 'Ireland',
    phone: {
      prefix: '+353',
      template: 'XX XXX XXXX',
      placeholder: '85 012 3456',
    },
  },
  {
    isoCode: 'FR',
    flag: '🇫🇷',
    name: 'France',
    phone: {
      prefix: '+33',
      template: 'X XX XX XX XX',
      placeholder: '6 12 34 56 78',
    },
  },
  {
    isoCode: 'DE',
    flag: '🇩🇪',
    name: 'Germany',
    phone: {
      prefix: '+49',
      template: 'XXXX XXXXXXX',
      placeholder: '1512 3456789',
    },
  },
  {
    isoCode: 'ES',
    flag: '🇪🇸',
    name: 'Spain',
    phone: {
      prefix: '+34',
      template: 'XXX XX XX XX',
      placeholder: '612 34 56 78',
    },
  },
  {
    isoCode: 'IT',
    flag: '🇮🇹',
    name: 'Italy',
    phone: {
      prefix: '+39',
      template: 'XXX XXX XXXX',
      placeholder: '312 345 6789',
    },
  },
  {
    isoCode: 'NL',
    flag: '🇳🇱',
    name: 'Netherlands',
    phone: { prefix: '+31', template: 'X XXXXXXXX', placeholder: '6 12345678' },
  },
  {
    isoCode: 'AU',
    flag: '🇦🇺',
    name: 'Australia',
    phone: {
      prefix: '+61',
      template: 'XXX XXX XXX',
      placeholder: '412 345 678',
    },
  },
  {
    isoCode: 'MX',
    flag: '🇲🇽',
    name: 'Mexico',
    phone: {
      prefix: '+52',
      template: 'XX XXXX XXXX',
      placeholder: '55 1234 5678',
    },
  },
  {
    isoCode: 'BR',
    flag: '🇧🇷',
    name: 'Brazil',
    phone: {
      prefix: '+55',
      template: 'XX XXXXX-XXXX',
      placeholder: '11 91234-5678',
    },
  },
  {
    isoCode: 'IN',
    flag: '🇮🇳',
    name: 'India',
    phone: {
      prefix: '+91',
      template: 'XXXXX XXXXX',
      placeholder: '81234 56789',
    },
  },
  {
    isoCode: 'SG',
    flag: '🇸🇬',
    name: 'Singapore',
    phone: { prefix: '+65', template: 'XXXX XXXX', placeholder: '8123 4567' },
  },
  {
    isoCode: 'JP',
    flag: '🇯🇵',
    name: 'Japan',
    phone: {
      prefix: '+81',
      template: 'XX XXXX XXXX',
      placeholder: '90 1234 5678',
    },
  },
];

// The sheet and formatter only read the fields above; the rest of `Country`
// (currency, supported actions) is regions-API data the prototype has none of.
export const PROTOTYPE_PHONE_COUNTRIES = PHONE_COUNTRIES as Country[];

/** The country the field starts on. */
export const PROTOTYPE_DEFAULT_PHONE_COUNTRY = PROTOTYPE_PHONE_COUNTRIES[0];

/**
 * Whether the local digits fill the country's template exactly.
 *
 * @param localDigits - The digits typed after the dial code.
 * @param country - The selected country.
 * @returns Whether the number is complete.
 */
export const isPrototypePhoneComplete = (
  localDigits: string,
  country: Country,
): boolean =>
  localDigits.length > 0 &&
  localDigits.length === (country.phone.template.match(/X/g) ?? []).length;
