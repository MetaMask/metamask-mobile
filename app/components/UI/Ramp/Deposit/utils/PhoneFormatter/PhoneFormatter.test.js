import PhoneFormatter from './PhoneFormatter.js'
import minMetadata from 'libphonenumber-js/min/metadata'

// Simple test runner
function runTests() {
  console.log('🧪 Running PhoneFormatter Tests...\n')
  
  const formatter = new PhoneFormatter(minMetadata, {
    defaultCountry: 'US',
    useNationalFormat: true
  })

  let passed = 0
  let failed = 0

  function test(name, testFn) {
    try {
      const result = testFn()
      if (result === true || result === undefined) {
        console.log(`✅ ${name}`)
        passed++
      } else {
        console.log(`❌ ${name} - Expected true, got ${result}`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${name} - Error: ${error.message}`)
      failed++
    }
  }

  // Test 1: Basic formatting
  test('formatNational formats US number correctly', () => {
    const result = formatter.formatNational('+12133734253')
    return result === '(213) 373-4253'
  })

  test('formatInternational formats US number correctly', () => {
    const result = formatter.formatInternational('+12133734253')
    return result === '+1 213 373 4253'
  })

  test('formatE164 formats US number correctly', () => {
    const result = formatter.formatE164('+12133734253')
    return result === '+12133734253'
  })

  // Test 2: Real-time formatting
  test('formatAsYouType works correctly', () => {
    const result = formatter.formatAsYouType('2133734253', 'US', 'NATIONAL')
    return result.text === '(213) 373-4253' && result.template === '(___) ___-____'
  })

  // Test 3: Country conversion
  test('convertForNewCountry works correctly', () => {
    const result = formatter.convertForNewCountry('+12133734253', 'US', 'CA', true)
    return result === '21337334253'
  })

  // Test 4: Validation
  test('isValidPhoneNumber validates correctly', () => {
    return formatter.isValidPhoneNumber('+12133734253') === true
  })

  test('isPossiblePhoneNumber validates correctly', () => {
    return formatter.isPossiblePhoneNumber('+12133734253') === true
  })

  // Test 5: Country utilities
  test('getCountryCallingCode returns correct code', () => {
    return formatter.getCountryCallingCode('US') === '1'
  })

  test('getInternationalPrefix returns correct prefix', () => {
    return formatter.getInternationalPrefix('US') === '+1'
  })

  test('isSupportedCountry returns true for valid country', () => {
    return formatter.isSupportedCountry('US') === true
  })

  // Test 6: Parsing
  test('parsePhoneNumber returns correct details', () => {
    const result = formatter.parsePhoneNumber('+12133734253')
    return result.country === 'US' && result.countryCallingCode === '1'
  })

  // Test 7: Conversion
  test('convertInternationalToNational works correctly', () => {
    const result = formatter.convertInternationalToNational('+12133734253', 'US')
    return result === '21337334253'
  })

  test('stripCountryCallingCode works correctly', () => {
    const result = formatter.stripCountryCallingCode('+12133734253', 'US')
    return result === '21337334253'
  })

  // Test 8: Country detection
  test('getCountryFromIncompleteNumber detects country', () => {
    const result = formatter.getCountryFromIncompleteNumber('+1213')
    return result === 'US'
  })

  test('couldNumberBelongToCountry returns true for matching number', () => {
    return formatter.couldNumberBelongToCountry('+1213', 'US') === true
  })

  // Test 9: Utility methods
  test('getMaxNumberLength returns correct length', () => {
    const result = formatter.getMaxNumberLength('US')
    return result === 10
  })

  test('trimNumber trims to max length', () => {
    const result = formatter.trimNumber('21337342531234567890', 'US')
    return result === '2133734253'
  })

  test('parseDigits extracts only digits', () => {
    const result = formatter.parseDigits('(213) 373-4253')
    return result === '2133734253'
  })

  // Test 10: Initial phone digits
  test('getInitialPhoneDigits works correctly', () => {
    const result = formatter.getInitialPhoneDigits({
      value: '+12133734253',
      country: 'US',
      international: false,
      useNationalFormat: true
    })
    return result === '2133734253'
  })

  // Test 11: Different countries
  test('UK number formatting works correctly', () => {
    const result = formatter.formatNational('+447911123456', 'GB')
    return result === '07911 123456'
  })

  test('German number formatting works correctly', () => {
    const result = formatter.formatNational('+4915123456789', 'DE')
    return result === '0151 23456789'
  })

  // Test 12: Edge cases
  test('empty input returns empty string', () => {
    const result = formatter.formatNational('')
    return result === ''
  })

  test('null input returns empty string', () => {
    const result = formatter.formatNational(null)
    return result === ''
  })

  test('invalid number returns empty string', () => {
    const result = formatter.formatNational('invalid')
    return result === ''
  })

  // Test 13: Multiple metadata bundles
  test('max metadata works correctly', () => {
    const maxFormatter = new PhoneFormatter(require('libphonenumber-js/max/metadata'))
    const result = maxFormatter.formatNational('+12133734253')
    return result === '(213) 373-4253'
  })

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('🎉 All tests passed!')
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.')
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Node.js environment
  runTests()
} else {
  // Browser environment - export for manual testing
  window.runPhoneFormatterTests = runTests
}

export { runTests } 