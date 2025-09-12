import { CaipChainId } from '@metamask/utils';
import {
  BASE_MAINNET,
  BSC_MAINNET,
  ETHEREUM_MAINNET,
  LINEA_MAINNET,
  SOLANA_MAINNET,
} from './networks';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk/dist/Deposit';

export const MUSD_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  chainId: ETHEREUM_MAINNET.chainId,
  name: 'MetaMask USD',
  symbol: 'mUSD',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
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

export const MANUAL_BANK_TRANSFER_PAYMENT_METHODS = [
  'bank_transfer',
  'sepa_bank_transfer',
];

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];
