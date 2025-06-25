import {
  parsePhoneNumber,
  AsYouType,
  getCountryCallingCode,
  parseDigits,
  isValidPhoneNumber,
  isPossiblePhoneNumber,
  getCountries,
  isSupportedCountry
} from 'libphonenumber-js/core'

/**
 * PhoneFormatter - A class that provides phone number formatting functionality
 * extracted from react-phone-number-input library
 */
export default class PhoneFormatter {
  constructor(metadata, options = {}) {
    this.metadata = metadata
    this.options = {
      defaultCountry: null,
      useNationalFormat: true,
      limitMaxLength: true,
      ...options
    }
  }

  /**
   * Formats a phone number in the specified format
   * @param {string} value - Phone number to format
   * @param {string} format - Format type: 'NATIONAL', 'INTERNATIONAL', 'E164'
   * @param {string} country - Country code (optional)
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(value, format = 'NATIONAL', country = null) {
    if (!value) return ''
    
    const targetCountry = country || this.options.defaultCountry
    const phoneNumber = parsePhoneNumber(value, this.metadata)
    
    if (!phoneNumber) return ''
    
    // Handle legacy format names
    switch (format) {
      case 'National':
        format = 'NATIONAL'
        break
      case 'International':
        format = 'INTERNATIONAL'
        break
    }
    
    return phoneNumber.format(format)
  }

  /**
   * Formats a phone number as international
   * @param {string} value - Phone number to format
   * @param {string} country - Country code (optional)
   * @returns {string} International formatted phone number
   */
  formatInternational(value, country = null) {
    return this.formatPhoneNumber(value, 'INTERNATIONAL', country)
  }

  /**
   * Formats a phone number as national
   * @param {string} value - Phone number to format
   * @param {string} country - Country code (optional)
   * @returns {string} National formatted phone number
   */
  formatNational(value, country = null) {
    return this.formatPhoneNumber(value, 'NATIONAL', country)
  }

  /**
   * Formats a phone number as E.164
   * @param {string} value - Phone number to format
   * @param {string} country - Country code (optional)
   * @returns {string} E.164 formatted phone number
   */
  formatE164(value, country = null) {
    return this.formatPhoneNumber(value, 'E.164', country)
  }

  /**
   * Real-time formatting as user types
   * @param {string} input - User input
   * @param {string} country - Country code
   * @param {string} format - Input format: 'NATIONAL', 'INTERNATIONAL', 'NATIONAL_PART_OF_INTERNATIONAL'
   * @returns {object} { text: string, template: string }
   */
  formatAsYouType(input, country, format = 'NATIONAL') {
    const formatter = new AsYouType(country, this.metadata)
    
    let prefix = ''
    if (format === 'NATIONAL_PART_OF_INTERNATIONAL') {
      prefix = this.getInternationalPrefix(country)
    }
    
    // Format the number
    let text = formatter.input(prefix + input)
    let template = formatter.getTemplate()
    
    if (prefix) {
      text = this.removePrefixFromFormattedPhoneNumber(text, prefix)
      if (template) {
        template = this.removePrefixFromFormattedPhoneNumber(template, prefix)
      }
    }
    
    return { text, template }
  }

  /**
   * Converts phone digits when switching countries
   * @param {string} phoneDigits - Current phone digits
   * @param {string} prevCountry - Previous country
   * @param {string} newCountry - New country
   * @param {boolean} useNationalFormat - Whether to use national format
   * @returns {string} Converted phone digits
   */
  convertForNewCountry(phoneDigits, prevCountry, newCountry, useNationalFormat = true) {
    if (prevCountry === newCountry) {
      return phoneDigits
    }

    if (!phoneDigits) {
      if (useNationalFormat) {
        return ''
      } else {
        if (newCountry) {
          return this.getInternationalPrefix(newCountry)
        }
        return ''
      }
    }

    if (newCountry) {
      if (phoneDigits[0] === '+') {
        if (useNationalFormat) {
          if (phoneDigits.indexOf('+' + this.getCountryCallingCode(newCountry)) === 0) {
            return this.stripCountryCallingCode(phoneDigits, newCountry)
          }
        }
        return ''
      }
    }

    return phoneDigits
  }

  /**
   * Gets the international prefix for a country
   * @param {string} country - Country code
   * @returns {string} International prefix (e.g., "+1" for US)
   */
  getInternationalPrefix(country) {
    return '+' + this.getCountryCallingCode(country)
  }

  /**
   * Gets the country calling code for a country
   * @param {string} country - Country code
   * @returns {string} Country calling code
   */
  getCountryCallingCode(country) {
    return getCountryCallingCode(country, this.metadata)
  }

  /**
   * Strips country calling code from a phone number
   * @param {string} number - Phone number with country calling code
   * @param {string} country - Country code
   * @returns {string} Phone number without country calling code
   */
  stripCountryCallingCode(number, country) {
    if (country) {
      const countryCallingCodePrefix = '+' + this.getCountryCallingCode(country)
      
      if (number.length < countryCallingCodePrefix.length) {
        if (countryCallingCodePrefix.indexOf(number) === 0) {
          return ''
        }
      } else {
        if (number.indexOf(countryCallingCodePrefix) === 0) {
          return number.slice(countryCallingCodePrefix.length)
        }
      }
    }

    // Try all available country calling codes
    for (const countryCallingCode of Object.keys(this.metadata.country_calling_codes)) {
      if (number.indexOf(countryCallingCode) === '+'.length) {
        return number.slice('+'.length + countryCallingCode.length)
      }
    }

    return ''
  }

  /**
   * Removes prefix from formatted phone number
   * @param {string} text - Formatted phone number
   * @param {string} prefix - Prefix to remove
   * @returns {string} Phone number without prefix
   */
  removePrefixFromFormattedPhoneNumber(text, prefix) {
    if (text.indexOf(prefix) === 0) {
      return text.slice(prefix.length).trim()
    }
    return text
  }

  /**
   * Converts international phone digits to national format
   * @param {string} input - International phone digits
   * @param {string} country - Country code
   * @returns {string} National phone digits
   */
  convertInternationalToNational(input, country) {
    const prefix = this.getInternationalPrefix(country)
    
    if (input.indexOf(prefix) === 0) {
      const formatter = new AsYouType(country, this.metadata)
      formatter.input(input)
      const phoneNumber = formatter.getNumber()
      
      if (phoneNumber) {
        return phoneNumber.formatNational().replace(/\D/g, '')
      } else {
        return ''
      }
    } else {
      return input.replace(/\D/g, '')
    }
  }

  /**
   * Gets national significant number digits
   * @param {string} number - Phone number
   * @param {string} country - Country code
   * @returns {string} National significant number digits
   */
  getNationalSignificantNumberDigits(number, country) {
    const formatter = new AsYouType(country, this.metadata)
    formatter.input(number)
    const phoneNumber = formatter.getNumber()
    return phoneNumber && phoneNumber.nationalNumber
  }

  /**
   * Determines country from incomplete international phone number
   * @param {string} number - Incomplete international phone number
   * @returns {string|null} Country code or null
   */
  getCountryFromIncompleteNumber(number) {
    const formatter = new AsYouType(null, this.metadata)
    formatter.input(number)
    return formatter.getCountry()
  }

  /**
   * Checks if a number could belong to a country
   * @param {string} number - Phone number
   * @param {string} country - Country code
   * @returns {boolean} True if number could belong to country
   */
  couldNumberBelongToCountry(number, country) {
    const intlPhoneNumberPrefix = this.getInternationalPrefix(country)
    let i = 0
    while (i < number.length && i < intlPhoneNumberPrefix.length) {
      if (number[i] !== intlPhoneNumberPrefix[i]) {
        return false
      }
      i++
    }
    return true
  }

  /**
   * Validates a phone number
   * @param {string} value - Phone number to validate
   * @param {string} country - Country code (optional)
   * @returns {boolean} True if valid
   */
  isValidPhoneNumber(value, country = null) {
    return isValidPhoneNumber(value, this.metadata)
  }

  /**
   * Checks if a phone number is possible
   * @param {string} value - Phone number to check
   * @param {string} country - Country code (optional)
   * @returns {boolean} True if possible
   */
  isPossiblePhoneNumber(value, country = null) {
    return isPossiblePhoneNumber(value, this.metadata)
  }

  /**
   * Gets all supported countries
   * @returns {string[]} Array of country codes
   */
  getCountries() {
    return getCountries(this.metadata)
  }

  /**
   * Checks if a country is supported
   * @param {string} country - Country code
   * @returns {boolean} True if supported
   */
  isSupportedCountry(country) {
    return isSupportedCountry(country, this.metadata)
  }

  /**
   * Parses phone number to get details
   * @param {string} value - Phone number to parse
   * @returns {object|null} Phone number object or null
   */
  parsePhoneNumber(value) {
    return parsePhoneNumber(value, this.metadata)
  }

  /**
   * Gets the maximum length for a country's phone numbers
   * @param {string} country - Country code
   * @returns {number} Maximum length
   */
  getMaxNumberLength(country) {
    if (!country || !this.metadata.countries[country]) {
      return 15 // Default international max length
    }
    
    const countryMetadata = this.metadata.countries[country]
    return countryMetadata[4] || 15
  }

  /**
   * Trims phone number to maximum length for country
   * @param {string} number - Phone number
   * @param {string} country - Country code
   * @returns {string} Trimmed phone number
   */
  trimNumber(number, country) {
    const maxLength = this.getMaxNumberLength(country)
    if (number.length > maxLength) {
      return number.slice(0, maxLength)
    }
    return number
  }

  /**
   * Gets initial phone digits for a value
   * @param {object} options - Options object
   * @param {string} options.value - E.164 phone number
   * @param {string} options.country - Country code
   * @param {boolean} options.international - Whether to use international format
   * @param {boolean} options.useNationalFormat - Whether to use national format
   * @returns {string} Initial phone digits
   */
  getInitialPhoneDigits({ value, country, international = false, useNationalFormat = true }) {
    const targetCountry = country || this.options.defaultCountry
    
    if ((international === false || useNationalFormat) && value) {
      const phoneNumber = this.parsePhoneNumber(value)
      if (phoneNumber && phoneNumber.country) {
        return parseDigits(phoneNumber.formatNational())
      }
    }
    
    if (!value && international && targetCountry) {
      return this.getInternationalPrefix(targetCountry)
    }
    
    return value || ''
  }

  /**
   * Extracts only digits from a string
   * @param {string} input - Input string
   * @returns {string} Digits only
   */
  parseDigits(input) {
    return parseDigits(input)
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
} 