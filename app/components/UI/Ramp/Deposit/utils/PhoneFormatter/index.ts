import {
  parsePhoneNumber,
  AsYouType,
  getCountryCallingCode,
  parseDigits,
  isValidPhoneNumber,
  isPossiblePhoneNumber,
  getCountries,
  isSupportedCountry,
  CountryCallingCode,
  CountryCode,
  MetadataJson,
  PhoneNumber,
  NumberFormat
} from 'libphonenumber-js/core'
import minMetadata from 'libphonenumber-js/min/metadata'

export interface PhoneFormatterOptions {
  defaultCountry?: CountryCode | null;
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
  country: CountryCode;
  international?: boolean;
  useNationalFormat?: boolean;
}

/**
 * PhoneFormatter - A class that provides phone number formatting functionality
 * extracted from react-phone-number-input library
 */
export default class PhoneFormatter {
  private metadata: MetadataJson;
  private options: Required<PhoneFormatterOptions>;

  constructor(options: PhoneFormatterOptions = {}) {
    this.metadata = minMetadata;
    this.options = {
      defaultCountry: null,
      useNationalFormat: true,
      limitMaxLength: true,
      ...options
    };
  }

  /**
   * Formats a phone number in the specified format
   * @param value - Phone number to format
   * @param format - Format type: 'NATIONAL', 'INTERNATIONAL', 'E164'
   * @param country - Country code (optional)
   * @returns Formatted phone number
   */
  formatPhoneNumber(value: string, format: NumberFormat | 'National' | 'International' = 'NATIONAL', country: CountryCode | null = null): string {
    if (!value) return '';
    
    try {
      // For partial numbers during typing, use AsYouType
      if (country) {
        const formatter = new AsYouType(country, this.metadata);
        formatter.input(value);
        const phoneNumber = formatter.getNumber();
        
        if (phoneNumber) {
          // Handle legacy format names
          let normalizedFormat: NumberFormat = format as NumberFormat;
          switch (format) {
            case 'National':
              normalizedFormat = 'NATIONAL';
              break;
            case 'International':
              normalizedFormat = 'INTERNATIONAL';
              break;
          }
          
          return phoneNumber.format(normalizedFormat);
        }
      }
      
      // Fallback to parsePhoneNumber for complete numbers
      const phoneNumber = parsePhoneNumber(value, this.metadata);
      
      if (!phoneNumber) return '';
      
      // Handle legacy format names
      let normalizedFormat: NumberFormat = format as NumberFormat;
      switch (format) {
        case 'National':
          normalizedFormat = 'NATIONAL';
          break;
        case 'International':
          normalizedFormat = 'INTERNATIONAL';
          break;
      }
      
      return phoneNumber.format(normalizedFormat);
    } catch (error) {
      // If parsing fails (e.g., TOO_SHORT error), return the original value
      // This allows for partial input during typing
      return value;
    }
  }

  /**
   * Formats a phone number as international
   * @param value - Phone number to format
   * @param country - Country code (optional)
   * @returns International formatted phone number
   */
  formatInternational(value: string, country: CountryCode | null = null): string {
    return this.formatPhoneNumber(value, 'INTERNATIONAL', country);
  }

  /**
   * Formats a phone number as national
   * @param value - Phone number to format
   * @param country - Country code (optional)
   * @returns National formatted phone number
   */
  formatNational(value: string, country: CountryCode | null = null): string {
    return this.formatPhoneNumber(value, 'NATIONAL', country);
  }

  /**
   * Formats a phone number as E.164
   * @param value - Phone number to format
   * @param country - Country code (optional)
   * @returns E.164 formatted phone number
   */
  formatE164(value: string, country: CountryCode | null = null): string {
    if (!value) return '';
    
    try {
      // For partial numbers during typing, use AsYouType
      if (country) {
        const formatter = new AsYouType(country, this.metadata);
        formatter.input(value);
        const phoneNumber = formatter.getNumber();
        
        if (phoneNumber) {
          return phoneNumber.format('E.164');
        }
        
        // If we can't get a complete number but have a country, 
        // try to construct a partial E.164 format
        const digits = this.parseDigits(value);
        if (digits) {
          const countryCode = this.getCountryCallingCode(country);
          return `+${countryCode}${digits}`;
        }
      }
      
      // Fallback to parsePhoneNumber for complete numbers
      const phoneNumber = parsePhoneNumber(value, this.metadata);
      
      if (!phoneNumber) return '';
      
      return phoneNumber.format('E.164');
    } catch (error) {
      // If parsing fails, try to construct a basic E.164 format
      if (country && value) {
        const digits = this.parseDigits(value);
        if (digits) {
          const countryCode = this.getCountryCallingCode(country);
          return `+${countryCode}${digits}`;
        }
      }
      
      // Return original value if all else fails
      return value;
    }
  }

  /**
   * Real-time formatting as user types
   * @param input - User input
   * @param country - Country code
   * @param format - Input format: 'NATIONAL', 'INTERNATIONAL', 'NATIONAL_PART_OF_INTERNATIONAL'
   * @returns { text: string, template: string }
   */
  formatAsYouType(input: string, country: CountryCode, format: 'NATIONAL' | 'INTERNATIONAL' | 'NATIONAL_PART_OF_INTERNATIONAL' = 'NATIONAL'): FormatAsYouTypeResult {
    const formatter = new AsYouType(country, this.metadata);
    
    let prefix = '';
    if (format === 'NATIONAL_PART_OF_INTERNATIONAL') {
      prefix = this.getInternationalPrefix(country);
    }
    
    // Format the number
    let text = formatter.input(prefix + input);
    let template = formatter.getTemplate();
    
    if (prefix) {
      text = this.removePrefixFromFormattedPhoneNumber(text, prefix);
      if (template) {
        template = this.removePrefixFromFormattedPhoneNumber(template, prefix);
      }
    }
    
    return { text, template };
  }

  /**
   * Converts phone digits when switching countries
   * @param phoneDigits - Current phone digits
   * @param prevCountry - Previous country
   * @param newCountry - New country
   * @param useNationalFormat - Whether to use national format
   * @returns Converted phone digits
   */
  convertForNewCountry(phoneDigits: string, prevCountry: CountryCode, newCountry: CountryCode, useNationalFormat: boolean = true): string {
    if (prevCountry === newCountry) {
      return phoneDigits;
    }

    if (!phoneDigits) {
      if (useNationalFormat) {
        return '';
      } else {
        if (newCountry) {
          return this.getInternationalPrefix(newCountry);
        }
        return '';
      }
    }

    if (newCountry) {
      if (phoneDigits[0] === '+') {
        if (useNationalFormat) {
          if (phoneDigits.indexOf('+' + this.getCountryCallingCode(newCountry)) === 0) {
            return this.stripCountryCallingCode(phoneDigits, newCountry);
          }
        }
        return '';
      }
    }

    return phoneDigits;
  }

  /**
   * Gets the international prefix for a country
   * @param country - Country code
   * @returns International prefix (e.g., "+1" for US)
   */
  getInternationalPrefix(country: CountryCode): string {
    return '+' + this.getCountryCallingCode(country);
  }

  /**
   * Gets the country calling code for a country
   * @param country - Country code
   * @returns Country calling code
   */
  getCountryCallingCode(country: CountryCode): CountryCallingCode {
    return getCountryCallingCode(country, this.metadata);
  }

  /**
   * Strips country calling code from a phone number
   * @param number - Phone number with country calling code
   * @param country - Country code
   * @returns Phone number without country calling code
   */
  stripCountryCallingCode(number: string, country: CountryCode): string {
    if (country) {
      const countryCallingCodePrefix = '+' + this.getCountryCallingCode(country);
      
      if (number.length < countryCallingCodePrefix.length) {
        if (countryCallingCodePrefix.indexOf(number) === 0) {
          return '';
        }
      } else {
        if (number.indexOf(countryCallingCodePrefix) === 0) {
          return number.slice(countryCallingCodePrefix.length);
        }
      }
    }

    // Try all available country calling codes
    for (const countryCallingCode of Object.keys(this.metadata.country_calling_codes)) {
      if (number.indexOf(countryCallingCode) === '+'.length) {
        return number.slice('+'.length + countryCallingCode.length);
      }
    }

    return '';
  }

  /**
   * Removes prefix from formatted phone number
   * @param text - Formatted phone number
   * @param prefix - Prefix to remove
   * @returns Phone number without prefix
   */
  removePrefixFromFormattedPhoneNumber(text: string, prefix: string): string {
    if (text.indexOf(prefix) === 0) {
      return text.slice(prefix.length).trim();
    }
    return text;
  }

  /**
   * Converts international phone digits to national format
   * @param input - International phone digits
   * @param country - Country code
   * @returns National phone digits
   */
  convertInternationalToNational(input: string, country: CountryCode): string {
    const prefix = this.getInternationalPrefix(country);
    
    if (input.indexOf(prefix) === 0) {
      const formatter = new AsYouType(country, this.metadata);
      formatter.input(input);
      const phoneNumber = formatter.getNumber();
      
      if (phoneNumber) {
        return phoneNumber.formatNational().replace(/\D/g, '');
      } else {
        return '';
      }
    } else {
      return input.replace(/\D/g, '');
    }
  }

  /**
   * Gets national significant number digits
   * @param number - Phone number
   * @param country - Country code
   * @returns National significant number digits
   */
  getNationalSignificantNumberDigits(number: string, country: CountryCode): string | undefined {
    const formatter = new AsYouType(country, this.metadata);
    formatter.input(number);
    const phoneNumber = formatter.getNumber();
    return phoneNumber?.nationalNumber;
  }

  /**
   * Determines country from incomplete international phone number
   * @param number - Incomplete international phone number
   * @returns Country code or null
   */
  getCountryFromIncompleteNumber(number: string): CountryCode | undefined {
    const formatter = new AsYouType(undefined, this.metadata);
    formatter.input(number);
    return formatter.getCountry();
  }

  /**
   * Checks if a number could belong to a country
   * @param number - Phone number
   * @param country - Country code
   * @returns True if number could belong to country
   */
  couldNumberBelongToCountry(number: string, country: CountryCode): boolean {
    const intlPhoneNumberPrefix = this.getInternationalPrefix(country);
    let i = 0;
    while (i < number.length && i < intlPhoneNumberPrefix.length) {
      if (number[i] !== intlPhoneNumberPrefix[i]) {
        return false;
      }
      i++;
    }
    return true;
  }

  /**
   * Validates a phone number
   * @param value - Phone number to validate
   * @param country - Country code (optional)
   * @returns True if valid
   */
  isValidPhoneNumber(value: string, country: CountryCode | null = null): boolean {
    return isValidPhoneNumber(value, this.metadata);
  }

  /**
   * Checks if a phone number is possible
   * @param value - Phone number to check
   * @param country - Country code (optional)
   * @returns True if possible
   */
  isPossiblePhoneNumber(value: string, country: CountryCode | null = null): boolean {
    return isPossiblePhoneNumber(value, this.metadata);
  }

  /**
   * Gets all supported countries
   * @returns Array of country codes
   */
  getCountries(): CountryCode[] {
    return getCountries(this.metadata);
  }

  /**
   * Checks if a country is supported
   * @param country - Country code
   * @returns True if supported
   */
  isSupportedCountry(country: CountryCode): boolean {
    return isSupportedCountry(country, this.metadata);
  }

  /**
   * Parses phone number to get details
   * @param value - Phone number to parse
   * @returns Phone number object or null
   */
  parsePhoneNumber(value: string): PhoneNumber | undefined {
    try {
      return parsePhoneNumber(value, this.metadata);
    } catch (error) {
      // If parsing fails (e.g., TOO_SHORT error), return undefined
      // This allows for partial input during typing
      return undefined;
    }
  }

  /**
   * Gets the maximum length for a country's phone numbers
   * @param country - Country code
   * @returns Maximum length
   */
  getMaxNumberLength(country: CountryCode): number {
    if (!country || !this.metadata.countries[country]) {
      return 15; // Default international max length
    }
    
    const countryMetadata = this.metadata.countries[country];
    return countryMetadata[4] || 15;
  }

  /**
   * Trims phone number to maximum length for country
   * @param number - Phone number
   * @param country - Country code
   * @returns Trimmed phone number
   */
  trimNumber(number: string, country: CountryCode): string {
    const maxLength = this.getMaxNumberLength(country);
    if (number.length > maxLength) {
      return number.slice(0, maxLength);
    }
    return number;
  }

  /**
   * Gets initial phone digits for a value
   * @param options - Options object
   * @returns Initial phone digits
   */
  getInitialPhoneDigits({ value, country, international = false, useNationalFormat = true }: GetInitialPhoneDigitsOptions): string {
    const targetCountry = country || this.options.defaultCountry;
    
    if ((international === false || useNationalFormat) && value) {
      try {
        // Try using AsYouType first for better handling of partial numbers
        if (targetCountry) {
          const formatter = new AsYouType(targetCountry, this.metadata);
          formatter.input(value);
          const phoneNumber = formatter.getNumber();
          
          if (phoneNumber && phoneNumber.country) {
            return parseDigits(phoneNumber.formatNational());
          }
        }
        
        // Fallback to parsePhoneNumber for complete numbers
        const phoneNumber = this.parsePhoneNumber(value);
        if (phoneNumber && phoneNumber.country) {
          return parseDigits(phoneNumber.formatNational());
        }
      } catch (error) {
        // If parsing fails, return the original value
        return value;
      }
    }
    
    if (!value && international && targetCountry) {
      return this.getInternationalPrefix(targetCountry);
    }
    
    return value || '';
  }

  /**
   * Extracts only digits from a string
   * @param input - Input string
   * @returns Digits only
   */
  parseDigits(input: string): string {
    return parseDigits(input);
  }
}

// Export individual functions for convenience
export {
  parsePhoneNumber,
  AsYouType,
  getCountryCallingCode,
  parseDigits,
  isValidPhoneNumber,
  isPossiblePhoneNumber,
  getCountries,
  isSupportedCountry
}; 