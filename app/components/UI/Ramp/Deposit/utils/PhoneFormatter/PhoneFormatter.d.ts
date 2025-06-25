declare module './PhoneFormatter' {
  export interface PhoneFormatterOptions {
    defaultCountry?: string | null;
    useNationalFormat?: boolean;
    limitMaxLength?: boolean;
  }

  export interface FormatAsYouTypeResult {
    text: string;
    template: string;
  }

  export interface PhoneNumberDetails {
    country: string;
    countryCallingCode: string;
    nationalNumber: string;
  }

  export interface GetInitialPhoneDigitsOptions {
    value: string;
    country: string;
    international?: boolean;
    useNationalFormat?: boolean;
  }

  export default class PhoneFormatter {
    constructor(metadata: any, options?: PhoneFormatterOptions);
    
    formatPhoneNumber(value: string, format?: string, country?: string | null): string;
    formatInternational(value: string, country?: string | null): string;
    formatNational(value: string, country?: string | null): string;
    formatE164(value: string, country?: string | null): string;
    formatAsYouType(input: string, country: string, format?: string): FormatAsYouTypeResult;
    convertForNewCountry(phoneDigits: string, prevCountry: string, newCountry: string, useNationalFormat?: boolean): string;
    getInternationalPrefix(country: string): string;
    getCountryCallingCode(country: string): string;
    stripCountryCallingCode(number: string, country: string): string;
    removePrefixFromFormattedPhoneNumber(text: string, prefix: string): string;
    convertInternationalToNational(input: string, country: string): string;
    getNationalSignificantNumberDigits(number: string, country: string): string | undefined;
    getCountryFromIncompleteNumber(number: string): string | undefined;
    couldNumberBelongToCountry(number: string, country: string): boolean;
    isValidPhoneNumber(value: string, country?: string | null): boolean;
    isPossiblePhoneNumber(value: string, country?: string | null): boolean;
    getCountries(): string[];
    isSupportedCountry(country: string): boolean;
    parsePhoneNumber(value: string): PhoneNumberDetails | undefined;
    getMaxNumberLength(country: string): number;
    trimNumber(number: string, country: string): string;
    getInitialPhoneDigits(options: GetInitialPhoneDigitsOptions): string;
    parseDigits(input: string): string;
  }
} 