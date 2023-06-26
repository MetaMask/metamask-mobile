import { ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID } from 'wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';
import {
  hasDecimals,
  REGEX_1_ETH,
  REGEX_2ETH,
  REGEX_3200_USD,
  REGEX_6400_USD,
  REGEX_ACCOUNT_BALANCE,
  REGEX_ACTIVATION_KEY,
  REGEX_ADDRESS_WITH_SPACES,
  REGEX_COLOR_BLACK,
  REGEX_DECIMAL_STRING_MIGRATIONS,
  REGEX_DECIMAL_STRING,
  REGEX_DEFAULT_ACCOUNT,
  REGEX_ENS_NAME,
  REGEX_FRACTIONS,
  REGEX_HAS_ONE_DIGIT,
  REGEX_HEX_PREFIX,
  REGEX_INTEGER,
  REGEX_LOCAL_NETWORK,
  REGEX_NAME_INITIAL,
  REGEX_NODE_FILES,
  REGEX_NON_NUMBER,
  REGEX_NUMBER,
  REGEX_PORTFOLIO_URL,
  REGEX_PREFIXED_FORMATTED_HEX_STRING,
  REGEX_PRIVATE_CREDENTIALS,
  REGEX_REPLACE_NETWORK_ERROR_SENTRY,
  REGEX_SANITIZE_URL,
  REGEX_SEED_PHRASE,
  REGEX_START_URL,
  REGEX_TRAILING_SLASH,
  REGEX_TRAILING_ZERO,
  REGEX_TRANSACTION_NONCE,
  REGEX_URL_HTTP_TO_HTTPS,
  REGEX_URL,
  REGEX_VALID_CHAIN_ID_HEX,
  REGEX_VALID_CHAIN_ID,
  REGEX_WALLET_ADDRESS,
  REGEX_WHITE_SPACES,
} from '.';

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
    expect(REGEX_1_ETH.test('1 ETH')).toEqual(true);
  });

  it('should not match "2 ETH"', () => {
    expect(REGEX_1_ETH.test('2 ETH')).toEqual(false);
  });
});

describe('REGEX :: REGEX_2ETH', () => {
  it('should match "2 ETH"', () => {
    expect(REGEX_2ETH.test('2 ETH')).toEqual(true);
  });

  it('should not match "1 ETH"', () => {
    expect(REGEX_2ETH.test('1 ETH')).toEqual(false);
  });
});

describe('REGEX :: REGEX_3200_USD', () => {
  it('should match "$3200"', () => {
    expect(REGEX_3200_USD.test('$3200')).toEqual(true);
  });

  it('should not match "$6400"', () => {
    expect(REGEX_3200_USD.test('$6400')).toEqual(false);
  });
});

describe('REGEX :: REGEX_6400_USD', () => {
  it('should match "$6400"', () => {
    expect(REGEX_6400_USD.test('$6400')).toEqual(true);
  });

  it('should not match "$3200"', () => {
    expect(REGEX_6400_USD.test('$3200')).toEqual(false);
  });
});

describe('REGEX :: REGEX_ACCOUNT_BALANCE', () => {
  it(`should match "${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}"`, () => {
    expect(
      REGEX_ACCOUNT_BALANCE.test(ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID),
    ).toEqual(true);
  });

  it(`should not match "Account balance != ${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}"`, () => {
    expect(REGEX_ACCOUNT_BALANCE.test('123')).toEqual(false);
  });
});

describe('REGEX :: REGEX_ACTIVATION_KEY', () => {
  it('should match "Abc12345"', () => {
    expect(REGEX_ACTIVATION_KEY.test('Abc12345')).toEqual(true);
  });

  it('should match "Abc-123-45"', () => {
    expect(REGEX_ACTIVATION_KEY.test('Abc-123-45')).toEqual(true);
  });

  it('should not match "Abc_123_45"', () => {
    expect(REGEX_ACTIVATION_KEY.test('Abc_123_45')).toEqual(false);
  });
});

describe('REGEX :: REGEX_ADDRESS_WITH_SPACES', () => {
  it('should match "This is an address"', () => {
    expect(REGEX_ADDRESS_WITH_SPACES.test('This is an address')).toEqual(true);
  });

  it('should not match "NoSpaces"', () => {
    expect(REGEX_ADDRESS_WITH_SPACES.test('NoSpaces')).toEqual(false);
  });
});

describe('REGEX :: REGEX_COLOR_BLACK', () => {
  it('should match "This text is black"', () => {
    expect(REGEX_COLOR_BLACK.test('This text is black')).toEqual(true);
  });

  it('should not match "This text is not black"', () => {
    expect(REGEX_COLOR_BLACK.test('This text is not black')).toEqual(false);
  });
});

describe('REGEX :: REGEX_DECIMAL_STRING', () => {
  it('should match "9"', () => {
    expect(REGEX_DECIMAL_STRING.test('9')).toEqual(true);
  });

  it('should not match "0"', () => {
    expect(REGEX_DECIMAL_STRING.test('0')).toEqual(false);
  });
});

describe('REGEX :: REGEX_DECIMAL_STRING_MIGRATIONS', () => {
  it('should match "123"', () => {
    expect(REGEX_DECIMAL_STRING_MIGRATIONS.test('123')).toEqual(true);
  });

  it('should match "456789"', () => {
    expect(REGEX_DECIMAL_STRING_MIGRATIONS.test('456789')).toEqual(true);
  });

  it('should not match "0"', () => {
    expect(REGEX_DECIMAL_STRING_MIGRATIONS.test('0')).toEqual(false);
  });
});

describe('REGEX :: REGEX_DEFAULT_ACCOUNT', () => {
  it('should match "Account 123"', () => {
    expect(REGEX_DEFAULT_ACCOUNT.test('Account 123')).toEqual(true);
  });

  it('should not match "Account "', () => {
    expect(REGEX_DEFAULT_ACCOUNT.test('Account ')).toEqual(false);
  });
});

describe('REGEX :: REGEX_ENS_NAME', () => {
  it('should match a valid ENS name', () => {
    expect(REGEX_ENS_NAME.test('example.eth')).toEqual(true);
  });

  it('should not match an invalid ENS name', () => {
    expect(REGEX_ENS_NAME.test('example.eth.')).toEqual(false);
  });
});

describe('REGEX :: REGEX_FRACTIONS', () => {
  it('should match a fraction with non-zero numerator and denominator', () => {
    expect(REGEX_FRACTIONS.test('123/456')).toEqual(true);
  });

  it('should match a fraction with zero numerator and non-zero denominator', () => {
    expect(REGEX_FRACTIONS.test('0/123')).toEqual(true);
  });

  it('should match a fraction with zero numerator and zero denominator', () => {
    expect(REGEX_FRACTIONS.test('0/0')).toEqual(true);
  });

  it('should not match a fraction with non-zero numerator and zero denominator', () => {
    expect(REGEX_FRACTIONS.test('123/0')).toEqual(false);
  });

  it('should not match a fraction with leading zeros in numerator or denominator', () => {
    expect(REGEX_FRACTIONS.test('00123/0456')).toEqual(false);
  });
});

describe('REGEX :: REGEX_HAS_ONE_DIGIT', () => {
  it('should match a string with exactly one digit', () => {
    expect(REGEX_HAS_ONE_DIGIT.test('5')).toEqual(true);
  });

  it('should not match a string without a digit', () => {
    expect(REGEX_HAS_ONE_DIGIT.test('abc')).toEqual(false);
  });

  it('should not match a string with more than one digit', () => {
    expect(REGEX_HAS_ONE_DIGIT.test('123')).toEqual(false);
  });
});

describe('REGEX :: REGEX_HEX_PREFIX', () => {
  it('should match a string with a hexadecimal value and optional negative sign and "0x" prefix', () => {
    expect(REGEX_HEX_PREFIX.test('-0x123abc')).toEqual(true);
  });

  it('should not match a string without a hexadecimal value or "0x" prefix', () => {
    expect(REGEX_HEX_PREFIX.test('abc123')).toEqual(false);
  });
});

describe('REGEX :: REGEX_INTEGER', () => {
  it('should match an integer', () => {
    expect(REGEX_INTEGER.test('123')).toEqual(true);
  });

  it('should match an integer with a decimal point and trailing zeros', () => {
    expect(REGEX_INTEGER.test('123.000')).toEqual(true);
  });

  it('should match a negative integer', () => {
    expect(REGEX_INTEGER.test('-456')).toEqual(true);
  });

  it('should match a negative integer with a decimal point and trailing zeros', () => {
    expect(REGEX_INTEGER.test('-456.000')).toEqual(true);
  });

  it('should not match a non-integer value', () => {
    expect(REGEX_INTEGER.test('12.34')).toEqual(false);
  });
});

describe('REGEX :: REGEX_LOCAL_NETWORK', () => {
  it('should match a local network IP address starting with "127."', () => {
    expect(REGEX_LOCAL_NETWORK.test('127.0.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "10."', () => {
    expect(REGEX_LOCAL_NETWORK.test('10.0.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "172.16."', () => {
    expect(REGEX_LOCAL_NETWORK.test('172.16.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "172.31."', () => {
    expect(REGEX_LOCAL_NETWORK.test('172.31.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "192.168."', () => {
    expect(REGEX_LOCAL_NETWORK.test('192.168.0.1')).toEqual(true);
  });

  it('should not match a non-local IP address', () => {
    expect(REGEX_LOCAL_NETWORK.test('8.8.8.8')).toEqual(false);
  });
});

describe('REGEX :: REGEX_NAME_INITIAL', () => {
  it('should match a single letter as a name initial', () => {
    expect(REGEX_NAME_INITIAL.test('A')).toEqual(true);
  });

  it('should match a single letter (case insensitive) as a name initial', () => {
    expect(REGEX_NAME_INITIAL.test('z')).toEqual(true);
  });

  it('should not match a non-letter character', () => {
    expect(REGEX_NAME_INITIAL.test('1')).toEqual(false);
  });

  it('should not match a string with multiple characters', () => {
    expect(REGEX_NAME_INITIAL.test('AB')).toEqual(false);
  });
});

describe('REGEX :: REGEX_NODE_FILES', () => {
  it('should match a string containing "metro"', () => {
    expect(REGEX_NODE_FILES.test('metro-core')).toEqual(true);
  });

  it('should match a string containing "metro-" followed by any characters', () => {
    expect(REGEX_NODE_FILES.test('metro-source-map')).toEqual(true);
  });

  it('should not match a string not containing "metro"', () => {
    expect(REGEX_NODE_FILES.test('webpack')).toEqual(false);
  });
});

describe('REGEX :: REGEX_NON_NUMBER', () => {
  it('should match a string containing non-digit and non-decimal point characters', () => {
    expect(REGEX_NON_NUMBER.test('abc$%^')).toEqual(true);
  });

  it('should not match a string containing only digits', () => {
    expect(REGEX_NON_NUMBER.test('123456')).toEqual(false);
  });

  it('should not match a string containing only decimal points', () => {
    expect(REGEX_NON_NUMBER.test('...')).toEqual(false);
  });
});

describe('REGEX :: REGEX_NUMBER', () => {
  it('should match a positive integer', () => {
    expect(REGEX_NUMBER.test('123')).toEqual(true);
  });

  it('should match a positive decimal number', () => {
    expect(REGEX_NUMBER.test('12.34')).toEqual(true);
  });

  it('should match a negative decimal number', () => {
    expect(REGEX_NUMBER.test('-56.78')).toEqual(true);
  });

  it('should not match a string with non-numeric characters', () => {
    expect(REGEX_NUMBER.test('abc123')).toEqual(false);
  });

  it('should not match an empty string', () => {
    expect(REGEX_NUMBER.test('')).toEqual(false);
  });
});

describe('REGEX :: REGEX_PORTFOLIO_URL', () => {
  it('should not match empty string', () => {
    expect(REGEX_PORTFOLIO_URL.test('')).toEqual(false);
  });
  it('should empty url', () => {
    expect(REGEX_PORTFOLIO_URL.test('http://')).toEqual(false);
  });
  it('should match a valid url', () => {
    expect(
      REGEX_PORTFOLIO_URL.test('https://portfolio.metamask.io/some-url'),
    ).toEqual(true);
  });
});

describe('REGEX :: REGEX_PREFIXED_FORMATTED_HEX_STRING', () => {
  it('should match a formatted hexadecimal string with "0x" prefix', () => {
    expect(REGEX_PREFIXED_FORMATTED_HEX_STRING.test('0x1A2B3C')).toEqual(true);
  });

  it('should match a formatted hexadecimal string with "0x" prefix and lowercase letters', () => {
    expect(REGEX_PREFIXED_FORMATTED_HEX_STRING.test('0xabcdef')).toEqual(true);
  });

  it('should match a formatted hexadecimal string with "0x" prefix and trailing zeros', () => {
    expect(REGEX_PREFIXED_FORMATTED_HEX_STRING.test('0x123000')).toEqual(true);
  });

  it('should not match a non-formatted hexadecimal string without "0x" prefix', () => {
    expect(REGEX_PREFIXED_FORMATTED_HEX_STRING.test('123abc')).toEqual(false);
  });

  it('should not match a string with non-hexadecimal characters', () => {
    expect(REGEX_PREFIXED_FORMATTED_HEX_STRING.test('0x12G34')).toEqual(false);
  });
});

describe('REGEX :: REGEX_PRIVATE_CREDENTIALS', () => {
  it('should match a string containing double quotation marks', () => {
    expect(REGEX_PRIVATE_CREDENTIALS.test('Hello "World"')).toEqual(true);
  });

  it('should match multiple occurrences of double quotation marks in a string', () => {
    expect(REGEX_PRIVATE_CREDENTIALS.test('""""')).toEqual(true);
  });

  it('should not match a string without double quotation marks', () => {
    expect(REGEX_PRIVATE_CREDENTIALS.test('Hello World')).toEqual(false);
  });
});

describe('REGEX :: REGEX_REPLACE_NETWORK_ERROR_SENTRY', () => {
  it('should match a string containing a 40-character hexadecimal value with "0x" prefix', () => {
    expect(
      REGEX_REPLACE_NETWORK_ERROR_SENTRY.test(
        'Error occurred at 0x1234567890ABCDEF1234567890ABCDEF12345678',
      ),
    ).toEqual(true);
  });

  it('should not match a string without a 40-character hexadecimal value', () => {
    expect(
      REGEX_REPLACE_NETWORK_ERROR_SENTRY.test('Error occurred at 0xabcdef'),
    ).toEqual(false);
  });

  it('should not match a string with a hexadecimal value without "0x" prefix', () => {
    expect(
      REGEX_REPLACE_NETWORK_ERROR_SENTRY.test(
        'Error occurred at 1234567890ABCDEF1234567890ABCDEF12345678',
      ),
    ).toEqual(false);
  });
});

describe('REGEX :: REGEX_SANITIZE_URL', () => {
  it('should match a valid URL starting with "http://"', () => {
    expect(REGEX_SANITIZE_URL.test('http://www.example.com')).toEqual(true);
  });

  it('should match a valid URL starting with "https://"', () => {
    expect(REGEX_SANITIZE_URL.test('https://www.example.com')).toEqual(true);
  });

  it('should match a valid URL without "www."', () => {
    expect(REGEX_SANITIZE_URL.test('https://example.com')).toEqual(true);
  });

  it('should match a valid URL with path and query parameters', () => {
    expect(
      REGEX_SANITIZE_URL.test('https://www.example.com/path?param=value'),
    ).toEqual(true);
  });

  it('should not match an invalid URL', () => {
    expect(REGEX_SANITIZE_URL.test('invalid-url')).toEqual(false);
  });
});

describe('REGEX :: REGEX_SEED_PHRASE', () => {
  it('should match a string with one or more word characters (letters, numbers, underscore)', () => {
    expect(REGEX_SEED_PHRASE.test('hello_world_123')).toEqual(true);
  });

  it('should match multiple occurrences of word characters in a string', () => {
    expect(REGEX_SEED_PHRASE.test('this is a seed phrase')).toEqual(true);
  });

  it('should not match a string without word characters', () => {
    expect(REGEX_SEED_PHRASE.test('@#$%')).toEqual(false);
  });
});

describe('REGEX :: REGEX_START_URL', () => {
  it('should match a string starting with "www."', () => {
    expect(REGEX_START_URL.test('www.example.com')).toEqual(true);
  });

  it('should not match a string without "www."', () => {
    expect(REGEX_START_URL.test('example.com')).toEqual(false);
  });

  it('should not match a string with "www." in the middle', () => {
    expect(REGEX_START_URL.test('hello.www.example.com')).toEqual(false);
  });
});

describe('REGEX :: REGEX_TRAILING_SLASH', () => {
  it('should match a string ending with one or more slashes', () => {
    expect(REGEX_TRAILING_SLASH.test('example.com/')).toEqual(true);
  });

  it('should not match a string without a trailing slash', () => {
    expect(REGEX_TRAILING_SLASH.test('example.com')).toEqual(false);
  });

  it('should not match a string with slashes in the middle', () => {
    expect(REGEX_TRAILING_SLASH.test('example.com/path/to/resource')).toEqual(
      false,
    );
  });
});

describe('REGEX :: REGEX_TRAILING_ZERO', () => {
  it('should match a string ending with one or more zeros', () => {
    expect(REGEX_TRAILING_ZERO.test('10.5000')).toEqual(true);
  });

  it('should match a string ending with a decimal point followed by one or more zeros', () => {
    expect(REGEX_TRAILING_ZERO.test('10.')).toEqual(true);
  });

  it('should not match a string without trailing zeros', () => {
    expect(REGEX_TRAILING_ZERO.test('10.5')).toEqual(false);
  });

  it('should not match a string with non-zero characters after the decimal point', () => {
    expect(REGEX_TRAILING_ZERO.test('10.5001')).toEqual(false);
  });
});

describe('REGEX :: REGEX_TRANSACTION_NONCE', () => {
  it('should match a string starting with a pound sign', () => {
    expect(REGEX_TRANSACTION_NONCE.test('#123')).toEqual(true);
  });

  it('should not match a string without a pound sign', () => {
    expect(REGEX_TRANSACTION_NONCE.test('123')).toEqual(false);
  });

  it('should not match a string with a pound sign in the middle', () => {
    expect(REGEX_TRANSACTION_NONCE.test('hello#123')).toEqual(false);
  });
});

describe('REGEX :: REGEX_URL', () => {
  it('should match a valid URL starting with "http://"', () => {
    expect(REGEX_URL.test('http://www.example.com')).toEqual(true);
  });

  it('should match a valid URL starting with "https://"', () => {
    expect(REGEX_URL.test('https://www.example.com')).toEqual(true);
  });

  it('should match a valid URL without "www."', () => {
    expect(REGEX_URL.test('https://example.com')).toEqual(true);
  });

  it('should match a valid URL with path and query parameters', () => {
    expect(REGEX_URL.test('https://www.example.com/path?param=value')).toEqual(
      true,
    );
  });

  it('should not match an invalid URL', () => {
    expect(REGEX_URL.test('invalid-url')).toEqual(false);
  });
});

describe('REGEX :: REGEX_URL_HTTP_TO_HTTPS', () => {
  it('should match a string starting with "http://"', () => {
    expect(REGEX_URL_HTTP_TO_HTTPS.test('http://www.example.com')).toEqual(
      true,
    );
  });

  it('should not match a string starting with "https://"', () => {
    expect(REGEX_URL_HTTP_TO_HTTPS.test('https://www.example.com')).toEqual(
      false,
    );
  });

  it('should not match a string without "http://"', () => {
    expect(REGEX_URL_HTTP_TO_HTTPS.test('www.example.com')).toEqual(false);
  });
});

describe('REGEX :: REGEX_VALID_CHAIN_ID', () => {
  it('should match a string consisting of digits', () => {
    expect(REGEX_VALID_CHAIN_ID.test('12345')).toEqual(true);
  });

  it('should not match a string with non-digit characters', () => {
    expect(REGEX_VALID_CHAIN_ID.test('abc123')).toEqual(false);
  });
});

describe('REGEX :: REGEX_VALID_CHAIN_ID_HEX', () => {
  it('should match a string starting with "0x" followed by hex digits', () => {
    expect(REGEX_VALID_CHAIN_ID_HEX.test('0xabcdef')).toEqual(true);
  });

  it('should match a string starting with "0x" followed by uppercase hex digits', () => {
    expect(REGEX_VALID_CHAIN_ID_HEX.test('0xABCDEF')).toEqual(true);
  });

  it('should not match a string without "0x"', () => {
    expect(REGEX_VALID_CHAIN_ID_HEX.test('abcdef')).toEqual(false);
  });

  it('should not match a string with non-hex characters', () => {
    expect(REGEX_VALID_CHAIN_ID_HEX.test('0xg1h2i3j')).toEqual(false);
  });
});

describe('REGEX :: REGEX_WALLET_ADDRESS', () => {
  it('should match a string starting with "0x" followed by 40 hex characters', () => {
    expect(
      REGEX_WALLET_ADDRESS.test('0x1234567890abcdefABCDEF1234567890abcdef'),
    ).toEqual(true);
  });

  it('should match a string starting with "0x" followed by 40 uppercase hex characters', () => {
    expect(
      REGEX_WALLET_ADDRESS.test('0xABCDEF1234567890ABCDEF1234567890ABCDEF'),
    ).toEqual(true);
  });

  it('should not match a string without "0x"', () => {
    expect(
      REGEX_WALLET_ADDRESS.test('1234567890abcdefABCDEF1234567890abcdef'),
    ).toEqual(false);
  });

  it('should not match a string with non-hex characters', () => {
    expect(
      REGEX_WALLET_ADDRESS.test('0xg1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z'),
    ).toEqual(false);
  });
});

describe('REGEX :: REGEX_WHITE_SPACES', () => {
  it('should match a string with one or more white spaces', () => {
    expect(REGEX_WHITE_SPACES.test('Hello   World')).toEqual(true);
  });

  it('should not match a string without white spaces', () => {
    expect(REGEX_WHITE_SPACES.test('HelloWorld')).toEqual(false);
  });

  it('should match multiple occurrences of white spaces', () => {
    expect(REGEX_WHITE_SPACES.test('Hello    World')).toEqual(true);
  });
});
