import AppConstants from '../../core/AppConstants';
import { ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID } from '../../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';

export function hasDecimals(separator: string, decimalPlaces: string) {
  return new RegExp(`^\\d+\\${separator}\\d{${decimalPlaces}}$`, 'g');
}

export function hasProtocol(url: string) {
  return /^[a-z]*:\/\//.test(url);
}

interface Currency {
  [key: number]: RegExp;
}

export interface RegexTypes {
  eth: Currency;
  usd: Currency;
  account_balance: RegExp;
  activation_key: RegExp;
  address_with_spaces: RegExp;
  color_black: RegExp;
  decimal_string_migrations: RegExp;
  decimal_string: RegExp;
  default_account: RegExp;
  ens_name: RegExp;
  fractions: RegExp;
  has_one_digit: RegExp;
  hex_prefix: RegExp;
  integer: RegExp;
  local_network: RegExp;
  name_initial: RegExp;
  non_number: RegExp;
  number: RegExp;
  portfolio_url: RegExp;
  prefixed_formatted_hex_string: RegExp;
  private_credentials: RegExp;
  replace_network_error_sentry: RegExp;
  sanitize_url: RegExp;
  seed_phrase: RegExp;
  start_url: RegExp;
  trailing_slash: RegExp;
  trailing_zero: RegExp;
  transaction_nonce: RegExp;
  url_http_to_https: RegExp;
  url: RegExp;
  valid_chain_id_hex: RegExp;
  valid_chain_id: RegExp;
  wallet_address: RegExp;
  white_spaces: RegExp;
}

export const regex: RegexTypes = {
  eth: { 1: /1 ETH/, 2: /2 ETH/ },
  usd: { 3200: /\$3200/, 6400: /\$6400/ },
  account_balance: new RegExp(`${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}`),
  activation_key: /^[a-zA-Z0-9\\-]{1,32}$/,
  address_with_spaces: /\s/g,
  color_black: /black/g,
  decimal_string: /[1-9]/,
  decimal_string_migrations: /^[1-9]\d*$/u,
  default_account: /^Account\s\d+$/,
  // // Checks that the domain consists of at least one valid domain pieces separated by periods, followed by a tld
  // // Each piece of domain name has only the characters a-z, 0-9, and a hyphen (but not at the start or end of chunk)
  // // A chunk has minimum length of 1, but minimum tld is set to 2 for now (no 1-character tlds exist yet)
  ens_name:
    /^(?:[a-z0-9](?:[-a-z0-9]*[a-z0-9])?\.)+[a-z0-9][-a-z0-9]*[a-z0-9]$/u,
  fractions: /^(0|[1-9]\d*)\/((?<=0\/)0|[1-9]\d*)$/, // TODO: fix invalid group specifier name
  has_one_digit: /^\d$/,
  hex_prefix: /^-?0x/u,
  integer: /^-?\d*(\.0+|\.)?$/,
  local_network:
    /(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/,

  name_initial: /^[a-zA-Z]$/,
  non_number: /[^0-9.]/g,
  number: /^-?\d*\.?\d+$/,
  portfolio_url: new RegExp('^' + AppConstants.PORTFOLIO_URL + '[^ "]+$'),
  prefixed_formatted_hex_string: /^0x[1-9a-f]+[0-9a-f]*$/iu,
  private_credentials: /".*"/,
  replace_network_error_sentry: /0x[A-Fa-f0-9]{40}/u,
  sanitize_url: /^(http:\/\/|https:\/\/)[^ "]+$/,
  seed_phrase: /\w+/gu,
  start_url: /^www\./,
  trailing_slash: /\/+$/,
  trailing_zero: /(.*0$)|(.*\.0+$)/,
  transaction_nonce: /^#/,
  url: /^(http:\/\/|https:\/\/)[^ "]+$/,
  url_http_to_https: /^http:\/\//,
  valid_chain_id: /^[0-9]+$/u,
  valid_chain_id_hex: /^0x[0-9a-f]+$/iu,
  wallet_address: /^0x[a-fA-F0-9]{40}$/,
  white_spaces: /\s+/g,
};

/*
  REGEX_1_ETH,
  REGEX_2ETH,
  REGEX_3200_USD,
  REGEX_6400_USD,
  REGEX_ACCOUNT_BALANCE,
  REGEX_ACTIVATION_KEY,
  REGEX_ADDRESS_WITH_SPACES,
  REGEX_COLOR_BLACK,
  REGEX_DECIMAL_STRING_MIGRATIONS,
  REGEX_DEFAULT_ACCOUNT,
  REGEX_DECIMAL_STRING,
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
  REGEX_SANITIZE_URL,
  REGEX_REPLACE_NETWORK_ERROR_SENTRY,
  REGEX_SEED_PHRASE,
  REGEX_START_URL,
  REGEX_TRAILING_SLASH,
  REGEX_TRAILING_ZERO,
  REGEX_TRANSACTION_NONCE,
  REGEX_URL_HTTP_TO_HTTPS,
  REGEX_URL,
  REGEX_VALID_CHAIN_ID_HEX,
  REGEX_VALID_CHAIN_ID,
  REGEX_WHITE_SPACES,

  REGEX_WALLET_ADDRESS,
};
**/
