import { ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID } from '../../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';
import { regex, hasDecimals } from '.';

describe('REGEX :: hasDecimals', () => {
  const separator = '.';
  const decimalPlaces = '2';
  it('should match a number with 2 decimal places separated by "."', () => {
    expect(hasDecimals(separator, decimalPlaces).test('123.45')).toEqual(true);
  });

  it('should not match a number without decimal places', () => {
    expect(hasDecimals(separator, decimalPlaces).test('123')).toEqual(false);
  });

  it('should not match a number with more than 2 decimal places', () => {
    expect(hasDecimals(separator, decimalPlaces).test('123.456')).toEqual(
      false,
    );
  });

  it('should not match a number with a different separator', () => {
    expect(hasDecimals(separator, decimalPlaces).test('123,45')).toEqual(false);
  });
});

describe('REGEX :: REGEX_1_ETH', () => {
  it('should match "1 ETH"', () => {
    expect(regex.eth(1).test('1 ETH')).toEqual(true);
  });

  it('should not match "2 ETH"', () => {
    expect(regex.eth(1).test('2 ETH')).toEqual(false);
  });
});

describe('REGEX :: REGEX_2ETH', () => {
  it('should match "2 ETH"', () => {
    expect(regex.eth(2).test('2 ETH')).toEqual(true);
  });

  it('should not match "1 ETH"', () => {
    expect(regex.eth(2).test('1 ETH')).toEqual(false);
  });
});

describe('REGEX :: REGEX_3200_USD', () => {
  it('should match "$3200"', () => {
    expect(regex.usd(3200).test('$3200')).toEqual(true);
  });

  it('should not match "$6400"', () => {
    expect(regex.usd(3200).test('$6400')).toEqual(false);
  });
});

describe('REGEX :: REGEX_6400_USD', () => {
  it('should match "$6400"', () => {
    expect(regex.usd(6400).test('$6400')).toEqual(true);
  });

  it('should not match "$3200"', () => {
    expect(regex.usd(6400).test('$3200')).toEqual(false);
  });
});

describe('REGEX :: regex.accountBalance', () => {
  it(`should match "${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}"`, () => {
    expect(
      regex.accountBalance.test(ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID),
    ).toEqual(true);
  });

  it(`should not match "Account balance != ${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}"`, () => {
    expect(regex.accountBalance.test('123')).toEqual(false);
  });
});

describe('REGEX :: regex.activationKey', () => {
  it('should match "Abc12345"', () => {
    expect(regex.activationKey.test('Abc12345')).toEqual(true);
  });

  it('should match "Abc-123-45"', () => {
    expect(regex.activationKey.test('Abc-123-45')).toEqual(true);
  });

  it('should not match "Abc_123_45"', () => {
    expect(regex.activationKey.test('Abc_123_45')).toEqual(false);
  });
});

describe('REGEX :: regex.addressWithSpaces', () => {
  it('should match "This is an address"', () => {
    expect(regex.addressWithSpaces.test('This is an address')).toEqual(true);
  });

  it('should not match "NoSpaces"', () => {
    expect(regex.addressWithSpaces.test('NoSpaces')).toEqual(false);
  });
});

describe('REGEX :: regex.colorBlack', () => {
  it('should match "This text is black"', () => {
    expect(regex.colorBlack.test('This text is black')).toEqual(true);
  });

  it('should not match "This text is not black"', () => {
    expect(regex.colorBlack.test('This text is not black')).toEqual(false);
  });
});

describe('REGEX :: regex.decimalString', () => {
  it('should match "9"', () => {
    expect(regex.decimalString.test('9')).toEqual(true);
  });

  it('should not match "0"', () => {
    expect(regex.decimalString.test('0')).toEqual(false);
  });
});

describe('REGEX :: regex.decimalStringMigrations', () => {
  it('should match "123"', () => {
    expect(regex.decimalStringMigrations.test('123')).toEqual(true);
  });

  it('should match "456789"', () => {
    expect(regex.decimalStringMigrations.test('456789')).toEqual(true);
  });

  it('should not match "0"', () => {
    expect(regex.decimalStringMigrations.test('0')).toEqual(false);
  });
});

describe('REGEX :: regex.defaultAccount', () => {
  it('should match "Account 123"', () => {
    expect(regex.defaultAccount.test('Account 123')).toEqual(true);
  });
});

describe('REGEX :: regex.ensName', () => {
  it('should match a valid ENS name', () => {
    expect(regex.ensName.test('example.eth')).toEqual(true);
  });

  it('should not match an invalid ENS name', () => {
    expect(regex.ensName.test('example.eth.')).toEqual(false);
  });
});

describe('REGEX :: regex.fractions', () => {
  it('should match a fraction with non-zero numerator and denominator', () => {
    expect(regex.fractions.test('123/456')).toEqual(true);
  });

  it('should match a fraction with zero numerator and non-zero denominator', () => {
    expect(regex.fractions.test('0/123')).toEqual(true);
  });

  it('should match a fraction with zero numerator and zero denominator', () => {
    expect(regex.fractions.test('0/0')).toEqual(true);
  });
});

describe('REGEX :: regex.hasOneDigit', () => {
  it('should match a string with exactly one digit', () => {
    expect(regex.hasOneDigit.test('5')).toEqual(true);
  });

  it('should not match a string without a digit', () => {
    expect(regex.hasOneDigit.test('abc')).toEqual(false);
  });

  it('should not match a string with more than one digit', () => {
    expect(regex.hasOneDigit.test('123')).toEqual(false);
  });
});

describe('REGEX :: regex.hexPrefix', () => {
  it('should match a string with a hexadecimal value and optional negative sign and "0x" prefix', () => {
    expect(regex.hexPrefix.test('-0x123abc')).toEqual(true);
  });

  it('should not match a string without a hexadecimal value or "0x" prefix', () => {
    expect(regex.hexPrefix.test('abc123')).toEqual(false);
  });
});

describe('REGEX :: regex.integer', () => {
  it('should match an integer', () => {
    expect(regex.integer.test('123')).toEqual(true);
  });

  it('should match an integer with a decimal point and trailing zeros', () => {
    expect(regex.integer.test('123.000')).toEqual(true);
  });

  it('should match a negative integer', () => {
    expect(regex.integer.test('-456')).toEqual(true);
  });

  it('should match a negative integer with a decimal point and trailing zeros', () => {
    expect(regex.integer.test('-456.000')).toEqual(true);
  });

  it('should not match a non-integer value', () => {
    expect(regex.integer.test('12.34')).toEqual(false);
  });
});

describe('REGEX :: regex.localNetwork', () => {
  it('should match a local network IP address starting with "127."', () => {
    expect(regex.localNetwork.test('127.0.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "10."', () => {
    expect(regex.localNetwork.test('10.0.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "172.16."', () => {
    expect(regex.localNetwork.test('172.16.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "172.31."', () => {
    expect(regex.localNetwork.test('172.31.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "192.168."', () => {
    expect(regex.localNetwork.test('192.168.0.1')).toEqual(true);
  });

  it('should not match a non-local IP address', () => {
    expect(regex.localNetwork.test('8.8.8.8')).toEqual(false);
  });
});

describe('REGEX :: regex.nameInitial', () => {
  it('should match a single letter as a name initial', () => {
    expect(regex.nameInitial.test('A')).toEqual(true);
  });

  it('should match a single letter (case insensitive) as a name initial', () => {
    expect(regex.nameInitial.test('z')).toEqual(true);
  });

  it('should not match a non-letter character', () => {
    expect(regex.nameInitial.test('1')).toEqual(false);
  });
});

describe('REGEX :: regex.nonNumber', () => {
  it('should match a string containing non-digit and non-decimal point characters', () => {
    expect(regex.nonNumber.test('abc$%^')).toEqual(true);
  });

  it('should not match a string containing only digits', () => {
    expect(regex.nonNumber.test('123456')).toEqual(false);
  });

  it('should not match a string containing only decimal points', () => {
    expect(regex.nonNumber.test('...')).toEqual(false);
  });
});

describe('REGEX :: regex.number', () => {
  it('should match a positive integer', () => {
    expect(regex.number.test('123')).toEqual(true);
  });

  it('should match a positive decimal number', () => {
    expect(regex.number.test('12.34')).toEqual(true);
  });

  it('should not match a string with non-numeric characters', () => {
    expect(regex.number.test('abc123')).toEqual(false);
  });

  it('should not match an empty string', () => {
    expect(regex.number.test('')).toEqual(false);
  });
});

describe('REGEX :: regex.portfolioUrl', () => {
  it('should not match empty string', () => {
    expect(regex.portfolioUrl.test('')).toEqual(false);
  });
  it('should empty url', () => {
    expect(regex.portfolioUrl.test('http://')).toEqual(false);
  });
});

describe('REGEX :: regex.prefixedFormattedHexString', () => {
  it('should match a formatted hexadecimal string with "0x" prefix', () => {
    expect(regex.prefixedFormattedHexString.test('0x1A2B3C')).toEqual(true);
  });

  it('should match a formatted hexadecimal string with "0x" prefix and lowercase letters', () => {
    expect(regex.prefixedFormattedHexString.test('0xabcdef')).toEqual(true);
  });

  it('should match a formatted hexadecimal string with "0x" prefix and trailing zeros', () => {
    expect(regex.prefixedFormattedHexString.test('0x123000')).toEqual(true);
  });

  it('should not match a non-formatted hexadecimal string without "0x" prefix', () => {
    expect(regex.prefixedFormattedHexString.test('123abc')).toEqual(false);
  });

  it('should not match a string with non-hexadecimal characters', () => {
    expect(regex.prefixedFormattedHexString.test('0x12G34')).toEqual(false);
  });
});

describe('REGEX :: regex.privateCredentials', () => {
  it('should match a string containing double quotation marks', () => {
    expect(regex.privateCredentials.test('Hello "World"')).toEqual(true);
  });

  it('should not match a string without double quotation marks', () => {
    expect(regex.privateCredentials.test('Hello World')).toEqual(false);
  });
});

describe('REGEX :: regex.replaceNetworkErrorSentry', () => {
  it('should match a string containing a 40-character hexadecimal value with "0x" prefix', () => {
    expect(
      regex.replaceNetworkErrorSentry.test(
        'Error occurred at 0x1234567890ABCDEF1234567890ABCDEF12345678',
      ),
    ).toEqual(true);
  });

  it('should not match a string without a 40-character hexadecimal value', () => {
    expect(
      regex.replaceNetworkErrorSentry.test('Error occurred at 0xabcdef'),
    ).toEqual(false);
  });

  it('should not match a string with a hexadecimal value without "0x" prefix', () => {
    expect(
      regex.replaceNetworkErrorSentry.test(
        'Error occurred at 1234567890ABCDEF1234567890ABCDEF12345678',
      ),
    ).toEqual(false);
  });
});

describe('REGEX :: regex.sanitizeUrl', () => {
  it('should match a valid URL starting with "http://"', () => {
    expect(regex.sanitizeUrl.test('http://www.example.com')).toEqual(true);
  });

  it('should not match an invalid URL', () => {
    expect(regex.sanitizeUrl.test('invalid-url')).toEqual(false);
  });
});

describe('REGEX :: regex.seedPhrase', () => {
  it('should match a string with one or more word characters (letters, numbers, underscore)', () => {
    expect(regex.seedPhrase.test('helloWorld_123')).toEqual(true);
  });

  it('should match multiple occurrences of word characters in a string', () => {
    expect(regex.seedPhrase.test('this is a seed phrase')).toEqual(true);
  });

  it('should not match a string without word characters', () => {
    expect(regex.seedPhrase.test('@#$%')).toEqual(false);
  });
});

describe('REGEX :: regex.startUrl', () => {
  it('should match a string starting with "www."', () => {
    expect(regex.startUrl.test('www.example.com')).toEqual(true);
  });

  it('should not match a string without "www."', () => {
    expect(regex.startUrl.test('example.com')).toEqual(false);
  });

  it('should not match a string with "www." in the middle', () => {
    expect(regex.startUrl.test('hello.www.example.com')).toEqual(false);
  });
});

describe('REGEX :: regex.trailingSlash', () => {
  it('should match a string ending with one or more slashes', () => {
    expect(regex.trailingSlash.test('example.com/')).toEqual(true);
  });

  it('should not match a string without a trailing slash', () => {
    expect(regex.trailingSlash.test('example.com')).toEqual(false);
  });

  it('should not match a string with slashes in the middle', () => {
    expect(regex.trailingSlash.test('example.com/path/to/resource')).toEqual(
      false,
    );
  });
});

describe('REGEX :: regex.trailingZero', () => {
  it('should match a string ending with one or more zeros', () => {
    expect(regex.trailingZero.test('10.5000')).toEqual(true);
  });

  it('should match a string ending with a decimal point followed by one or more zeros', () => {
    expect(regex.trailingZero.test('10.0')).toEqual(true);
  });

  it('should not match a string without trailing zeros', () => {
    expect(regex.trailingZero.test('10.5')).toEqual(false);
  });

  it('should not match a string with non-zero characters after the decimal point', () => {
    expect(regex.trailingZero.test('10.5001')).toEqual(false);
  });
});

describe('REGEX :: regex.transactionNonce', () => {
  it('should match a string starting with a pound sign', () => {
    expect(regex.transactionNonce.test('#123')).toEqual(true);
  });

  it('should not match a string without a pound sign', () => {
    expect(regex.transactionNonce.test('123')).toEqual(false);
  });

  it('should not match a string with a pound sign in the middle', () => {
    expect(regex.transactionNonce.test('hello#123')).toEqual(false);
  });
});

describe('REGEX :: regex.url', () => {
  it('should match a valid URL starting with "http://"', () => {
    expect(regex.url.test('http://www.example.com')).toEqual(true);
  });

  it('should not match an invalid URL', () => {
    expect(regex.url.test('invalid-url')).toEqual(false);
  });
});

describe('REGEX :: regex.urlHttpToHttps', () => {
  it('should match a string starting with "http://"', () => {
    expect(regex.urlHttpToHttps.test('http://www.example.com')).toEqual(true);
  });

  it('should not match a string starting with "https://"', () => {
    expect(regex.urlHttpToHttps.test('https://www.example.com')).toEqual(false);
  });

  it('should not match a string without "http://"', () => {
    expect(regex.urlHttpToHttps.test('www.example.com')).toEqual(false);
  });
});

describe('REGEX :: regex.validChainId', () => {
  it('should match a string consisting of digits', () => {
    expect(regex.validChainId.test('12345')).toEqual(true);
  });

  it('should not match a string with non-digit characters', () => {
    expect(regex.validChainId.test('abc123')).toEqual(false);
  });
});

describe('REGEX :: regex.validChainIdHex', () => {
  it('should match a string starting with "0x" followed by hex digits', () => {
    expect(regex.validChainIdHex.test('0xabcdef')).toEqual(true);
  });

  it('should match a string starting with "0x" followed by uppercase hex digits', () => {
    expect(regex.validChainIdHex.test('0xABCDEF')).toEqual(true);
  });

  it('should not match a string without "0x"', () => {
    expect(regex.validChainIdHex.test('abcdef')).toEqual(false);
  });

  it('should not match a string with non-hex characters', () => {
    expect(regex.validChainIdHex.test('0xg1h2i3j')).toEqual(false);
  });
});

describe('REGEX :: regex.walletAddress', () => {
  it('should match a string starting with "0x" followed by 40 hex characters', () => {
    expect(
      regex.walletAddress.test('0x1234567890abcdefABCDEF1234567890abcdefad'),
    ).toEqual(true);
  });

  it('should match a string starting with "0x" followed by 40 uppercase hex characters', () => {
    expect(
      regex.walletAddress.test('0xABCDEF1234567890ABCDEF1234567890ABCDEFAD'),
    ).toEqual(true);
  });

  it('should not match a string without "0x"', () => {
    expect(
      regex.walletAddress.test('1234567890abcdefABCDEF1234567890abcdef'),
    ).toEqual(false);
  });

  it('should not match a string with non-hex characters', () => {
    expect(
      regex.walletAddress.test('0xg1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z'),
    ).toEqual(false);
  });
});

describe('REGEX :: regex.whiteSpaces', () => {
  it('should match a string with one or more white spaces', () => {
    expect(regex.whiteSpaces.test('Hello   World')).toEqual(true);
  });

  it('should not match a string without white spaces', () => {
    expect(regex.whiteSpaces.test('HelloWorld')).toEqual(false);
  });

  it('should match multiple occurrences of white spaces', () => {
    expect(regex.whiteSpaces.test('Hello    World')).toEqual(true);
  });
});
