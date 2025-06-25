import PhoneFormatter from './PhoneFormatter.js'

// Import different metadata bundles based on your needs
import minMetadata from 'libphonenumber-js/min/metadata'      // ~80kB - default
import maxMetadata from 'libphonenumber-js/max/metadata'      // ~145kB - complete
import mobileMetadata from 'libphonenumber-js/mobile/metadata' // ~95kB - mobile only

// Example 1: Basic usage with min metadata
const formatter = new PhoneFormatter(minMetadata, {
  defaultCountry: 'US',
  useNationalFormat: true
})

// Example 2: Complete metadata for strict validation
const strictFormatter = new PhoneFormatter(maxMetadata, {
  defaultCountry: 'US',
  useNationalFormat: false
})

// Example 3: Mobile-only metadata
const mobileFormatter = new PhoneFormatter(mobileMetadata, {
  defaultCountry: 'US',
  useNationalFormat: true
})

// Usage examples:

// 1. Basic formatting
console.log(formatter.formatNational('+12133734253'))        // "(213) 373-4253"
console.log(formatter.formatInternational('+12133734253'))   // "+1 213 373 4253"
console.log(formatter.formatE164('+12133734253'))           // "+12133734253"

// 2. Real-time formatting as user types
const asYouTypeResult = formatter.formatAsYouType('2133734253', 'US', 'NATIONAL')
console.log(asYouTypeResult.text)     // "(213) 373-4253"
console.log(asYouTypeResult.template) // "(___) ___-____"

// 3. Country conversion
const converted = formatter.convertForNewCountry('+12133734253', 'US', 'CA', true)
console.log(converted) // "2133734253" (national format for Canada)

// 4. Validation
console.log(formatter.isValidPhoneNumber('+12133734253'))     // true
console.log(formatter.isPossiblePhoneNumber('+12133734253'))  // true

// 5. Country utilities
console.log(formatter.getCountryCallingCode('US'))           // "1"
console.log(formatter.getInternationalPrefix('US'))         // "+1"
console.log(formatter.isSupportedCountry('US'))             // true

// 6. Parsing
const parsed = formatter.parsePhoneNumber('+12133734253')
console.log(parsed.country)           // "US"
console.log(parsed.countryCallingCode) // "1"
console.log(parsed.nationalNumber)    // "2133734253"

// 7. International to national conversion
const national = formatter.convertInternationalToNational('+12133734253', 'US')
console.log(national) // "2133734253"

// 8. Get national significant digits
const significant = formatter.getNationalSignificantNumberDigits('2133734253', 'US')
console.log(significant) // "2133734253"

// 9. Country detection from incomplete number
const detectedCountry = formatter.getCountryFromIncompleteNumber('+1213')
console.log(detectedCountry) // "US"

// 10. Check if number could belong to country
const couldBelong = formatter.couldNumberBelongToCountry('+1213', 'US')
console.log(couldBelong) // true

// 11. Get maximum length for country
const maxLength = formatter.getMaxNumberLength('US')
console.log(maxLength) // 10

// 12. Trim number to max length
const trimmed = formatter.trimNumber('21337342531234567890', 'US')
console.log(trimmed) // "2133734253"

// 13. Get initial phone digits
const initial = formatter.getInitialPhoneDigits({
  value: '+12133734253',
  country: 'US',
  international: false,
  useNationalFormat: true
})
console.log(initial) // "2133734253"

// 14. Parse digits only
const digits = formatter.parseDigits('(213) 373-4253')
console.log(digits) // "2133734253"

// Example: Custom input component integration
class CustomPhoneInput {
  constructor(metadata, options = {}) {
    this.formatter = new PhoneFormatter(metadata, options)
    this.country = options.defaultCountry || 'US'
    this.format = options.format || 'NATIONAL'
  }

  // Handle user input
  handleInput(input) {
    const result = this.formatter.formatAsYouType(input, this.country, this.format)
    return {
      displayValue: result.text,
      template: result.template,
      isValid: this.formatter.isValidPhoneNumber(input, this.country),
      isPossible: this.formatter.isPossiblePhoneNumber(input, this.country)
    }
  }

  // Change country
  changeCountry(newCountry) {
    const currentValue = this.currentValue || ''
    this.currentValue = this.formatter.convertForNewCountry(
      currentValue, 
      this.country, 
      newCountry, 
      true
    )
    this.country = newCountry
    return this.currentValue
  }

  // Get formatted value
  getFormattedValue(format = 'NATIONAL') {
    return this.formatter.formatPhoneNumber(this.currentValue, format, this.country)
  }

  // Validate
  validate() {
    return this.formatter.isValidPhoneNumber(this.currentValue, this.country)
  }
}

// Usage of custom input
const customInput = new CustomPhoneInput(minMetadata, {
  defaultCountry: 'US',
  format: 'NATIONAL'
})

const inputResult = customInput.handleInput('2133734253')
console.log(inputResult.displayValue) // "(213) 373-4253"
console.log(inputResult.isValid)      // true

// Change country
const newValue = customInput.changeCountry('CA')
console.log(newValue) // "2133734253" (national format for Canada)

// Get formatted value
const formatted = customInput.getFormattedValue('INTERNATIONAL')
console.log(formatted) // "+1 213 373 4253" 