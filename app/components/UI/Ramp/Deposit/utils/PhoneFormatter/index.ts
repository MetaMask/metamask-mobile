import {
  AsYouType,
  getCountryCallingCode,
  parseDigits,
  CountryCode,
  MetadataJson,
} from 'libphonenumber-js/core';
import minMetadata from 'libphonenumber-js/min/metadata';
import maxMetadata from 'libphonenumber-js/max/metadata';

export interface FormatAsYouTypeResult {
  text: string;
  template: string;
}

/**
 * PhoneFormatter - A trimmed class that provides phone number formatting functionality
 * Only includes methods actually used by DepositPhoneField
 */
export default class PhoneFormatter {
  private metadata: MetadataJson;

  constructor() {
    this.metadata = maxMetadata;
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
        const digits = parseDigits(value);
        if (digits) {
          const countryCode = getCountryCallingCode(country, this.metadata);
          return `+${countryCode}${digits}`;
        }
      }

      // Return original value if all else fails
      return value;
    } catch (error) {
      // If parsing fails, try to construct a basic E.164 format
      if (country && value) {
        const digits = parseDigits(value);
        if (digits) {
          const countryCode = getCountryCallingCode(country, this.metadata);
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
   * @returns { text: string, template: string }
   */
  formatAsYouType(
    input: string,
    country: CountryCode,
  ): FormatAsYouTypeResult {
    const formatter = new AsYouType(country, this.metadata);

    // Format the number
    const text = formatter.input(input);
    const template = formatter.getTemplate();

    // Ensure template is defined
    if (!template) {
      // Fallback: generate a basic template based on the formatted text
      return { text, template: this.generateFallbackTemplate(text) };
    }

    return { text, template };
  }

  /**
   * Generate a fallback template when the formatter doesn't provide one
   */
  private generateFallbackTemplate(text: string): string {
    return text.replace(/\d/g, '_');
  }
}
