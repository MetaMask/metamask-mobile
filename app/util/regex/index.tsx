import AppConstants from 'app/core/AppConstants';
import { ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID } from 'wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';

function hasDecimals(separator: string, decimalPlaces: string) {
  return new RegExp(`^\\d+\\${separator}\\d{${decimalPlaces}}$`, 'g');
}

const REGEX_1_ETH = /1 ETH/;
const REGEX_2ETH = /2 ETH/;
const REGEX_3200_USD = /\$3200/;
const REGEX_6400_USD = /\$6400/;
const REGEX_ACCOUNT_BALANCE = new RegExp(
  `${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}`,
);
const REGEX_ACTIVATION_KEY = /^[a-zA-Z0-9\\-]{1,32}$/;
const REGEX_ADDRESS_WITH_SPACES = /\s/g;
const REGEX_COLOR_BLACK = /black/g;
const REGEX_DECIMAL_STRING = /[1-9]/;
const REGEX_DECIMAL_STRING_MIGRATIONS = /^[1-9]\d*$/u;
const REGEX_DEFAULT_ACCOUNT = /^Account \d*$/;

// Checks that the domain consists of at least one valid domain pieces separated by periods, followed by a tld
// Each piece of domain name has only the characters a-z, 0-9, and a hyphen (but not at the start or end of chunk)
// A chunk has minimum length of 1, but minimum tld is set to 2 for now (no 1-character tlds exist yet)
const REGEX_ENS_NAME =
  /^(?:[a-z0-9](?:[-a-z0-9]*[a-z0-9])?\.)+[a-z0-9][-a-z0-9]*[a-z0-9]$/u;

const REGEX_FRACTIONS = /^([0-9]*[1-9]|0)(0*)/;
const REGEX_HAS_ONE_DIGIT = /^\d$/;
const REGEX_HEX_PREFIX = /^-?0x/u;
const REGEX_INTEGER = /^-?\d*(\.0+|\.)?$/;
const REGEX_LOCAL_NETWORK =
  /(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/;
const REGEX_NAME_INITIAL = /[a-z]/i;
// metro, metro-core, metro-source-map, metro-etc.
const REGEX_NODE_FILES = new RegExp(['/metro(?:-[^/]*)?/'].join('|'));
const REGEX_NON_NUMBER = /[^0-9.]/g;
const REGEX_NUMBER = /^(\d+(\.\d+)?)$/;
const REGEX_PORTFOLIO_URL = new RegExp(
  `${AppConstants.PORTFOLIO_URL}/(?![a-z])`,
);
const REGEX_PREFIXED_FORMATTED_HEX_STRING = /^0x[1-9a-f]+[0-9a-f]*$/iu;
const REGEX_PRIVATE_CREDENTIALS = /"/g;
const REGEX_REPLACE_NETWORK_ERROR_SENTRY = /0x[A-Fa-f0-9]{40}/u;
const REGEX_SANITIZE_URL =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gu;
const REGEX_SEED_PHRASE = /\w+/gu;
const REGEX_START_URL = /^www\./;
const REGEX_TRAILING_SLASH = /\/+$/;
const REGEX_TRAILING_ZERO = /\.?0+$/;
const REGEX_TRANSACTION_NONCE = /^#/;
const REGEX_URL = new RegExp(
  /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!&',;=.+]+$/g,
);
const REGEX_URL_HTTP_TO_HTTPS = /^http:\/\//;
const REGEX_VALID_CHAIN_ID = /^[0-9]+$/u;
const REGEX_VALID_CHAIN_ID_HEX = /^0x[0-9a-f]+$/iu;
const REGEX_WALLET_ADDRESS = /^(0x){1}[0-9a-fA-F]{40}$/i;
const REGEX_WHITE_SPACES = /\s+/g;

export {
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
};
