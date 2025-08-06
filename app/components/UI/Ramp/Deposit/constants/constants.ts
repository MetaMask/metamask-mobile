import { CaipChainId } from '@metamask/utils';
import {
  BASE_MAINNET,
  BSC_MAINNET,
  ETHEREUM_MAINNET,
  LINEA_MAINNET,
  SOLANA_MAINNET,
} from './networks';

export interface DepositFiatCurrency {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
}

export const USD_CURRENCY: DepositFiatCurrency = {
  id: 'USD',
  name: 'US Dollar',
  symbol: '$',
  emoji: '🇺🇸',
};

export const EUR_CURRENCY: DepositFiatCurrency = {
  id: 'EUR',
  name: 'Euro',
  symbol: '€',
  emoji: '🇪🇺',
};

export const TRANSAK_NETWORKS: Record<string, CaipChainId> = {
  ethereum: ETHEREUM_MAINNET.chainId,
  linea: LINEA_MAINNET.chainId,
  base: BASE_MAINNET.chainId,
  solana: SOLANA_MAINNET.chainId,
  bsc: BSC_MAINNET.chainId,
};

export const TRANSAK_SUPPORT_URL = 'https://support.transak.com';
export const TRANSAK_URL = 'https://www.transak.com';
export const CONSENSYS_PRIVACY_POLICY_URL =
  'https://consensys.net/privacy-policy';
export const TRANSAK_TERMS_URL_US =
  'https://www.transak.com/terms-of-service-us';
export const TRANSAK_TERMS_URL_WORLD =
  'https://www.transak.com/terms-of-service';

export enum KycStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const VALIDATION_REGEX = {
  firstName: /^(?!\s+$).{1,35}$/,
  lastName: /^(?!\s+$).{1,35}$/,
  mobileNumber: /^\+(?:[0-9]){6,14}[0-9]$/,
  dateOfBirth:
    /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/,
  addressLine1: /^(?!\s+$)(?=.*[a-zA-Z]).{3,50}$/,
  addressLine2: /^(?=.*[a-zA-Z]).{0,50}$|^\s*$/,
  city: /^(?!\s+$)(?=.*[a-zA-Z]).{2,25}$/,
  state: /^(?!\s+$)(?=.*[a-zA-Z]).{2,100}$/,
  postCode: /^(?!\s*$).+/,
};

export const REDIRECTION_URL =
  'https://on-ramp-content.api.cx.metamask.io/regions/fake-callback';

export enum TransakFormId {
  ID_PROOF = 'idProof',
  PURPOSE_OF_USAGE = 'purposeOfUsage',
  PERSONAL_DETAILS = 'personalDetails',
  ADDRESS = 'address',
  US_SSN = 'usSSN',
}
