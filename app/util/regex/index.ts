import AppConstants from '../../core/AppConstants';
import { RegexTypes } from './index.types';
import { ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID } from '../../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';

export function hasDecimals(separator: string, decimalPlaces: string) {
  return new RegExp(`^\\d+\\${separator}\\d{${decimalPlaces}}$`, 'g');
}

export function hasProtocol(url: string) {
  return /^[a-z]*:\/\//.test(url);
}

export const regex: RegexTypes = {
  eth: (num: number) => new RegExp(`${num} ETH`),
  usd: (num: number) => new RegExp(`${num}`),
  accountBalance: new RegExp(`${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}`),
  activationKey: /^[a-zA-Z0-9\\-]{1,32}$/,

  addressWithSpaces: /\s/g,
  colorBlack: /black/g,
  decimalString: /[1-9]/,
  decimalStringMigrations: /^[1-9]\d*$/u,
  defaultAccount: /^Account \d*$/,
  exec: (exp: string, input: string) => new RegExp(exp).exec(input),
  // Checks that the domain consists of at least one valid domain pieces separated by periods, followed by a tld
  // Each piece of domain name has only the characters a-z, 0-9, and a hyphen (but not at the start or end of chunk)
  // A chunk has minimum length of 1, but minimum tld is set to 2 for now (no 1-character tlds exist yet)
  ensName:
    /^(?:[a-z0-9](?:[-a-z0-9]*[a-z0-9])?\.)+[a-z0-9][-a-z0-9]*[a-z0-9]$/u,
  fractions: /^([0-9]*[1-9]|0)(0*)/,
  hasOneDigit: /^\d$/,
  hexPrefix: /^-?0x/u,
  integer: /^-?\d*(\.0+|\.)?$/,
  localNetwork:
    /(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/,
  nameInitial: /[a-z]/i,
  nonNumber: /[^0-9.]/g,
  number: /^(\d+(\.\d+)?)$/,
  portfolioUrl: new RegExp(`${AppConstants.PORTFOLIO_URL}/(?![a-z])`),
  prefixedFormattedHexString: /^0x[1-9a-f]+[0-9a-f]*$/iu,
  privateCredentials: /"/g,
  replaceNetworkErrorSentry: /0x[A-Fa-f0-9]{40}/u,
  sanitizeUrl:
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gu,
  seedPhrase: /\w+/gu,
  startUrl: /^www\./,
  trailingSlash: /\/+$/,
  trailingZero: /\.?0+$/,
  transactionNonce: /^#/,
  url: new RegExp(
    /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!&',,=.+]+$/g,
  ),
  urlHttpToHttps: /^http:\/\//,
  validChainId: /^[0-9]+$/u,
  validChainIdHex: /^0x[0-9a-f]+$/iu,
  walletAddress: /^(0x){1}[0-9a-fA-F]{40}$/i,
  whiteSpaces: /\s+/g,
};
