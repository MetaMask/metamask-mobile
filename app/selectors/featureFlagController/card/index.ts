import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

const defaultCardFeatureFlag: CardFeatureFlag = {
  chains: {
    'eip155:59144': {
      balanceScannerAddress: '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a',
      enabled: true,
      foxConnectAddresses: {
        global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
        us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
      },
      tokens: [
        {
          address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
          decimals: 6,
          enabled: true,
          name: 'USD Coin',
          symbol: 'USDC',
        },
        {
          address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
          decimals: 6,
          enabled: true,
          name: 'Tether USD',
          symbol: 'USDT',
        },
        {
          address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
          decimals: 18,
          enabled: true,
          name: 'Wrapped Ether',
          symbol: 'WETH',
        },
        {
          address: '0x3ff47c5Bf409C86533FE1f4907524d304062428D',
          decimals: 18,
          enabled: true,
          name: 'EURe',
          symbol: 'EURe',
        },
        {
          address: '0x3Bce82cf1A2bc357F956dd494713Fe11DC54780f',
          decimals: 18,
          enabled: true,
          name: 'GBPe',
          symbol: 'GBPe',
        },
        {
          address: '0x374D7860c4f2f604De0191298dD393703Cce84f3',
          decimals: 6,
          enabled: true,
          name: 'Aave USDC',
          symbol: 'aUSDC',
        },
        {
          address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
          decimals: 6,
          enabled: true,
          name: 'MetaMask USD',
          symbol: 'mUSD',
        },
      ],
    },
    'eip155:8453': {
      enabled: true,
      foxConnectAddresses: {
        global: '0xDaBDaFC43B2BC1c7D10C2BBce950A8CAd4a367F8',
        us: '0xDaBDaFC43B2BC1c7D10C2BBce950A8CAd4a367F8',
      },
      tokens: [
        {
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          decimals: 6,
          enabled: true,
          name: 'USD Coin',
          symbol: 'USDC',
        },
        {
          address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
          decimals: 6,
          enabled: true,
          name: 'Tether USD',
          symbol: 'USDT',
        },
        {
          address: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB',
          decimals: 6,
          enabled: true,
          name: 'Aave Base USDC',
          symbol: 'aUSDC',
        },
      ],
    },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
      enabled: true,
      tokens: [
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6,
          enabled: true,
          name: 'USDC',
          symbol: 'USDC',
        },
        {
          address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          decimals: 6,
          enabled: true,
          name: 'USDT',
          symbol: 'USDT',
        },
      ],
    },
  },
  constants: {
    accountsApiUrl: 'https://accounts.api.cx.metamask.io',
    onRampApiUrl: 'https://on-ramp.uat-api.cx.metamask.io',
  },
};

const defaultCardSupportedCountries: CardSupportedCountries = {
  GG: true,
  DE: true,
  NO: true,
  'CA-QC': true,
  GI: true,
  AD: true,
  BE: true,
  FI: true,
  'CA-NB': true,
  SV: true,
  IM: true,
  'CA-MB': true,
  'CA-PE': true,
  PT: true,
  UY: true,
  BG: true,
  CH: true,
  DK: true,
  MT: true,
  'CA-SK': true,
  LU: true,
  HR: true,
  IS: true,
  'CA-YT': true,
  GR: true,
  IT: true,
  MX: true,
  CO: true,
  FR: true,
  GT: true,
  HU: true,
  'CA-NL': true,
  ES: true,
  'CA-ON': true,
  'CA-BC': true,
  BR: true,
  'CA-AB': true,
  AR: true,
  PA: true,
  SE: true,
  AT: true,
  'CA-NS': true,
  'CA-NT': true,
  CY: true,
  'CA-NU': true,
  SI: true,
  UK: true,
  SK: true,
  GB: true,
  JE: true,
  IE: true,
  PL: true,
  LI: true,
  RO: true,
  NL: true,
};

export type CardSupportedCountries = Record<string, boolean>;

export interface GateVersionedFeatureFlag {
  enabled: boolean;
  minimumVersion: string;
}

export interface CardFeatureFlag {
  constants?: Record<string, string>;
  chains?: Record<string, SupportedChain>;
}

export interface SupportedChain {
  enabled?: boolean | null;
  balanceScannerAddress?: `0x${string}` | null;
  foxConnectAddresses?: {
    global?: `0x${string}` | null;
    us?: `0x${string}` | null;
  };
  tokens?: SupportedToken[] | null;
}

export interface SupportedToken {
  address?: string | null;
  decimals?: number | null;
  enabled?: boolean | null;
  name?: string | null;
  symbol?: string | null;
}

export const selectCardSupportedCountries = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    remoteFeatureFlags?.cardSupportedCountries ??
    (defaultCardSupportedCountries as CardSupportedCountries),
);

export const selectDisplayCardButtonFeatureFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.displayCardButton as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectCardExperimentalSwitch = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.cardExperimentalSwitch2 as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectCardFeatureFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const cardFeatureFlag = remoteFeatureFlags?.cardFeature;

    return Object.keys(cardFeatureFlag ?? {}).length > 0
      ? cardFeatureFlag
      : defaultCardFeatureFlag;
  },
);

export const selectMetalCardCheckoutFeatureFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.metalCardCheckoutEnabled as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
