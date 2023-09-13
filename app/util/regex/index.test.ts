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
    expect(regex.eth[1].test('1 ETH')).toEqual(true);
  });

  it('should not match "2 ETH"', () => {
    expect(regex.eth[1].test('2 ETH')).toEqual(false);
  });
});

describe('REGEX :: REGEX_2ETH', () => {
  it('should match "2 ETH"', () => {
    expect(regex.eth[2].test('2 ETH')).toEqual(true);
  });

  it('should not match "1 ETH"', () => {
    expect(regex.eth[2].test('1 ETH')).toEqual(false);
  });
});

describe('REGEX :: REGEX_3200_USD', () => {
  it('should match "$3200"', () => {
    expect(regex.usd[3200].test('$3200')).toEqual(true);
  });

  it('should not match "$6400"', () => {
    expect(regex.usd[3200].test('$6400')).toEqual(false);
  });
});

describe('REGEX :: REGEX_6400_USD', () => {
  it('should match "$6400"', () => {
    expect(regex.usd[6400].test('$6400')).toEqual(true);
  });

  it('should not match "$3200"', () => {
    expect(regex.usd[6400].test('$3200')).toEqual(false);
  });
});

describe('REGEX :: regex.account_balance', () => {
  it(`should match "${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}"`, () => {
    expect(
      regex.account_balance.test(ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID),
    ).toEqual(true);
  });

  it(`should not match "Account balance != ${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}"`, () => {
    expect(regex.account_balance.test('123')).toEqual(false);
  });
});

describe('REGEX :: regex.activation_key', () => {
  it('should match "Abc12345"', () => {
    expect(regex.activation_key.test('Abc12345')).toEqual(true);
  });

  it('should match "Abc-123-45"', () => {
    expect(regex.activation_key.test('Abc-123-45')).toEqual(true);
  });

  it('should not match "Abc_123_45"', () => {
    expect(regex.activation_key.test('Abc_123_45')).toEqual(false);
  });
});

describe('REGEX :: regex.address_with_spaces', () => {
  it('should match "This is an address"', () => {
    expect(regex.address_with_spaces.test('This is an address')).toEqual(true);
  });

  it('should not match "NoSpaces"', () => {
    expect(regex.address_with_spaces.test('NoSpaces')).toEqual(false);
  });
});

describe('REGEX :: regex.color_black', () => {
  it('should match "This text is black"', () => {
    expect(regex.color_black.test('This text is black')).toEqual(true);
  });

  it('should not match "This text is not black"', () => {
    expect(regex.color_black.test('This text is not black')).toEqual(false);
  });
});

describe('REGEX :: regex.decimal_string', () => {
  it('should match "9"', () => {
    expect(regex.decimal_string.test('9')).toEqual(true);
  });

  it('should not match "0"', () => {
    expect(regex.decimal_string.test('0')).toEqual(false);
  });
});

describe('REGEX :: regex.decimal_string_migrations', () => {
  it('should match "123"', () => {
    expect(regex.decimal_string_migrations.test('123')).toEqual(true);
  });

  it('should match "456789"', () => {
    expect(regex.decimal_string_migrations.test('456789')).toEqual(true);
  });

  it('should not match "0"', () => {
    expect(regex.decimal_string_migrations.test('0')).toEqual(false);
  });
});

describe('REGEX :: regex.default_account', () => {
  it('should match "Account 123"', () => {
    expect(regex.default_account.test('Account 123')).toEqual(true);
  });

  it('should not match "Account "', () => {
    expect(regex.default_account.test('Account ')).toEqual(false);
  });
});

describe('REGEX :: regex.ens_name', () => {
  it('should match a valid ENS name', () => {
    expect(regex.ens_name.test('example.eth')).toEqual(true);
  });

  it('should not match an invalid ENS name', () => {
    expect(regex.ens_name.test('example.eth.')).toEqual(false);
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

  it('should not match a fraction with non-zero numerator and zero denominator', () => {
    expect(regex.fractions.test('123/0')).toEqual(false);
  });

  it('should not match a fraction with leading zeros in numerator or denominator', () => {
    expect(regex.fractions.test('00123/0456')).toEqual(false);
  });
});

describe('REGEX :: regex.has_one_digit', () => {
  it('should match a string with exactly one digit', () => {
    expect(regex.has_one_digit.test('5')).toEqual(true);
  });

  it('should not match a string without a digit', () => {
    expect(regex.has_one_digit.test('abc')).toEqual(false);
  });

  it('should not match a string with more than one digit', () => {
    expect(regex.has_one_digit.test('123')).toEqual(false);
  });
});

describe('REGEX :: regex.hex_prefix', () => {
  it('should match a string with a hexadecimal value and optional negative sign and "0x" prefix', () => {
    expect(regex.hex_prefix.test('-0x123abc')).toEqual(true);
  });

  it('should not match a string without a hexadecimal value or "0x" prefix', () => {
    expect(regex.hex_prefix.test('abc123')).toEqual(false);
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

describe('REGEX :: regex.local_network', () => {
  it('should match a local network IP address starting with "127."', () => {
    expect(regex.local_network.test('127.0.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "10."', () => {
    expect(regex.local_network.test('10.0.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "172.16."', () => {
    expect(regex.local_network.test('172.16.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "172.31."', () => {
    expect(regex.local_network.test('172.31.0.1')).toEqual(true);
  });

  it('should match a local network IP address starting with "192.168."', () => {
    expect(regex.local_network.test('192.168.0.1')).toEqual(true);
  });

  it('should not match a non-local IP address', () => {
    expect(regex.local_network.test('8.8.8.8')).toEqual(false);
  });
});

describe('REGEX :: regex.name_initial', () => {
  it('should match a single letter as a name initial', () => {
    expect(regex.name_initial.test('A')).toEqual(true);
  });

  it('should match a single letter (case insensitive) as a name initial', () => {
    expect(regex.name_initial.test('z')).toEqual(true);
  });

  it('should not match a non-letter character', () => {
    expect(regex.name_initial.test('1')).toEqual(false);
  });

  it('should not match a string with multiple characters', () => {
    expect(regex.name_initial.test('AB')).toEqual(false);
  });
});

describe('REGEX :: regex.non_number', () => {
  it('should match a string containing non-digit and non-decimal point characters', () => {
    expect(regex.non_number.test('abc$%^')).toEqual(true);
  });

  it('should not match a string containing only digits', () => {
    expect(regex.non_number.test('123456')).toEqual(false);
  });

  it('should not match a string containing only decimal points', () => {
    expect(regex.non_number.test('...')).toEqual(false);
  });
});

describe('REGEX :: regex.number', () => {
  it('should match a positive integer', () => {
    expect(regex.number.test('123')).toEqual(true);
  });

  it('should match a positive decimal number', () => {
    expect(regex.number.test('12.34')).toEqual(true);
  });

  it('should match a negative decimal number', () => {
    expect(regex.number.test('-56.78')).toEqual(true);
  });

  it('should not match a string with non-numeric characters', () => {
    expect(regex.number.test('abc123')).toEqual(false);
  });

  it('should not match an empty string', () => {
    expect(regex.number.test('')).toEqual(false);
  });
});

describe('REGEX :: regex.portfolio_url', () => {
  it('should not match empty string', () => {
    expect(regex.portfolio_url.test('')).toEqual(false);
  });
  it('should empty url', () => {
    expect(regex.portfolio_url.test('http://')).toEqual(false);
  });
  it('should match a valid url', () => {
    expect(
      regex.portfolio_url.test('https://portfolio.metamask.io/some-url'),
    ).toEqual(true);
  });
});

describe('REGEX :: regex.prefixed_formatted_hex_string', () => {
  it('should match a formatted hexadecimal string with "0x" prefix', () => {
    expect(regex.prefixed_formatted_hex_string.test('0x1A2B3C')).toEqual(true);
  });

  it('should match a formatted hexadecimal string with "0x" prefix and lowercase letters', () => {
    expect(regex.prefixed_formatted_hex_string.test('0xabcdef')).toEqual(true);
  });

  it('should match a formatted hexadecimal string with "0x" prefix and trailing zeros', () => {
    expect(regex.prefixed_formatted_hex_string.test('0x123000')).toEqual(true);
  });

  it('should not match a non-formatted hexadecimal string without "0x" prefix', () => {
    expect(regex.prefixed_formatted_hex_string.test('123abc')).toEqual(false);
  });

  it('should not match a string with non-hexadecimal characters', () => {
    expect(regex.prefixed_formatted_hex_string.test('0x12G34')).toEqual(false);
  });
});

describe('REGEX :: regex.private_credentials', () => {
  it('should match a string containing double quotation marks', () => {
    expect(regex.private_credentials.test('Hello "World"')).toEqual(true);
  });

  it('should match multiple occurrences of double quotation marks in a string', () => {
    expect(regex.private_credentials.test('""""')).toEqual(true);
  });

  it('should not match a string without double quotation marks', () => {
    expect(regex.private_credentials.test('Hello World')).toEqual(false);
  });
});

describe('REGEX :: regex.replace_network_error_sentry', () => {
  it('should match a string containing a 40-character hexadecimal value with "0x" prefix', () => {
    expect(
      regex.replace_network_error_sentry.test(
        'Error occurred at 0x1234567890ABCDEF1234567890ABCDEF12345678',
      ),
    ).toEqual(true);
  });

  it('should not match a string without a 40-character hexadecimal value', () => {
    expect(
      regex.replace_network_error_sentry.test('Error occurred at 0xabcdef'),
    ).toEqual(false);
  });

  it('should not match a string with a hexadecimal value without "0x" prefix', () => {
    expect(
      regex.replace_network_error_sentry.test(
        'Error occurred at 1234567890ABCDEF1234567890ABCDEF12345678',
      ),
    ).toEqual(false);
  });
});

describe('REGEX :: regex.sanitize_url', () => {
  it('should match a valid URL starting with "http://"', () => {
    expect(regex.sanitize_url.test('http://www.example.com')).toEqual(true);
  });

  it('should match a valid URL starting with "https://"', () => {
    expect(regex.sanitize_url.test('https://www.example.com')).toEqual(true);
  });

  it('should match a valid URL without "www."', () => {
    expect(regex.sanitize_url.test('https://example.com')).toEqual(true);
  });

  it('should match a valid URL with path and query parameters', () => {
    expect(
      regex.sanitize_url.test('https://www.example.com/path?param=value'),
    ).toEqual(true);
  });

  it('should not match an invalid URL', () => {
    expect(regex.sanitize_url.test('invalid-url')).toEqual(false);
  });
});

describe('REGEX :: regex.seed_phrase', () => {
  it('should match a string with one or more word characters (letters, numbers, underscore)', () => {
    expect(regex.seed_phrase.test('hello_world_123')).toEqual(true);
  });

  it('should match multiple occurrences of word characters in a string', () => {
    expect(regex.seed_phrase.test('this is a seed phrase')).toEqual(true);
  });

  it('should not match a string without word characters', () => {
    expect(regex.seed_phrase.test('@#$%')).toEqual(false);
  });
});

describe('REGEX :: regex.start_url', () => {
  it('should match a string starting with "www."', () => {
    expect(regex.start_url.test('www.example.com')).toEqual(true);
  });

  it('should not match a string without "www."', () => {
    expect(regex.start_url.test('example.com')).toEqual(false);
  });

  it('should not match a string with "www." in the middle', () => {
    expect(regex.start_url.test('hello.www.example.com')).toEqual(false);
  });
});

describe('REGEX :: regex.trailing_slash', () => {
  it('should match a string ending with one or more slashes', () => {
    expect(regex.trailing_slash.test('example.com/')).toEqual(true);
  });

  it('should not match a string without a trailing slash', () => {
    expect(regex.trailing_slash.test('example.com')).toEqual(false);
  });

  it('should not match a string with slashes in the middle', () => {
    expect(regex.trailing_slash.test('example.com/path/to/resource')).toEqual(
      false,
    );
  });
});

describe('REGEX :: regex.trailing_zero', () => {
  it('should match a string ending with one or more zeros', () => {
    expect(regex.trailing_zero.test('10.5000')).toEqual(true);
  });

  it('should match a string ending with a decimal point followed by one or more zeros', () => {
    expect(regex.trailing_zero.test('10.0')).toEqual(true);
  });

  it('should not match a string without trailing zeros', () => {
    expect(regex.trailing_zero.test('10.5')).toEqual(false);
  });

  it('should not match a string with non-zero characters after the decimal point', () => {
    expect(regex.trailing_zero.test('10.5001')).toEqual(false);
  });
});

describe('REGEX :: regex.transaction_nonce', () => {
  it('should match a string starting with a pound sign', () => {
    expect(regex.transaction_nonce.test('#123')).toEqual(true);
  });

  it('should not match a string without a pound sign', () => {
    expect(regex.transaction_nonce.test('123')).toEqual(false);
  });

  it('should not match a string with a pound sign in the middle', () => {
    expect(regex.transaction_nonce.test('hello#123')).toEqual(false);
  });
});

describe('REGEX :: regex.url', () => {
  it('should match a valid URL starting with "http://"', () => {
    expect(regex.url.test('http://www.example.com')).toEqual(true);
  });

  it('should match a valid URL starting with "https://"', () => {
    expect(regex.url.test('https://www.example.com')).toEqual(true);
  });

  it('should match a valid URL without "www."', () => {
    expect(regex.url.test('https://example.com')).toEqual(true);
  });

  it('should match a valid URL with path and query parameters', () => {
    expect(regex.url.test('https://www.example.com/path?param=value')).toEqual(
      true,
    );
  });

  it('should not match an invalid URL', () => {
    expect(regex.url.test('invalid-url')).toEqual(false);
  });
});

describe('REGEX :: regex.url_http_to_https', () => {
  it('should match a string starting with "http://"', () => {
    expect(regex.url_http_to_https.test('http://www.example.com')).toEqual(
      true,
    );
  });

  it('should not match a string starting with "https://"', () => {
    expect(regex.url_http_to_https.test('https://www.example.com')).toEqual(
      false,
    );
  });

  it('should not match a string without "http://"', () => {
    expect(regex.url_http_to_https.test('www.example.com')).toEqual(false);
  });
});

describe('REGEX :: regex.valid_chain_id', () => {
  it('should match a string consisting of digits', () => {
    expect(regex.valid_chain_id.test('12345')).toEqual(true);
  });

  it('should not match a string with non-digit characters', () => {
    expect(regex.valid_chain_id.test('abc123')).toEqual(false);
  });
});

describe('REGEX :: regex.valid_chain_id_hex', () => {
  it('should match a string starting with "0x" followed by hex digits', () => {
    expect(regex.valid_chain_id_hex.test('0xabcdef')).toEqual(true);
  });

  it('should match a string starting with "0x" followed by uppercase hex digits', () => {
    expect(regex.valid_chain_id_hex.test('0xABCDEF')).toEqual(true);
  });

  it('should not match a string without "0x"', () => {
    expect(regex.valid_chain_id_hex.test('abcdef')).toEqual(false);
  });

  it('should not match a string with non-hex characters', () => {
    expect(regex.valid_chain_id_hex.test('0xg1h2i3j')).toEqual(false);
  });
});

describe('REGEX :: regex.wallet_address', () => {
  it('should match a string starting with "0x" followed by 40 hex characters', () => {
    expect(
      regex.wallet_address.test('0x1234567890abcdefABCDEF1234567890abcdefad'),
    ).toEqual(true);
  });

  it('should match a string starting with "0x" followed by 40 uppercase hex characters', () => {
    expect(
      regex.wallet_address.test('0xABCDEF1234567890ABCDEF1234567890ABCDEFAD'),
    ).toEqual(true);
  });

  it('should not match a string without "0x"', () => {
    expect(
      regex.wallet_address.test('1234567890abcdefABCDEF1234567890abcdef'),
    ).toEqual(false);
  });

  it('should not match a string with non-hex characters', () => {
    expect(
      regex.wallet_address.test('0xg1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z'),
    ).toEqual(false);
  });
});

describe('REGEX :: regex.white_spaces', () => {
  it('should match a string with one or more white spaces', () => {
    expect(regex.white_spaces.test('Hello   World')).toEqual(true);
  });

  it('should not match a string without white spaces', () => {
    expect(regex.white_spaces.test('HelloWorld')).toEqual(false);
  });

  it('should match multiple occurrences of white spaces', () => {
    expect(regex.white_spaces.test('Hello    World')).toEqual(true);
  });
});
