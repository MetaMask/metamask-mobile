import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { TokenI } from '../Tokens/types';

/** Native mainnet ETH CAIP-19 asset id for unified ramp buy flows. */
export const MAINNET_ETH_RAMP_ASSET_ID = 'eip155:1/slip44:60';

/** Mainnet mUSD CAIP-19 asset id (TMCU-681 fund-step preselection). */
export const MAINNET_MUSD_RAMP_ASSET_ID =
  'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA';

/** mUSD contract address on mainnet (same on supported ramp chains). */
export const MAINNET_MUSD_TOKEN_ADDRESS: Hex =
  '0xaca92e438df0b2401ff60da7e4337b687a2435da';

const MUSD_SYMBOL = 'mUSD';
const MUSD_NAME = 'MetaMask USD';
const MUSD_DECIMALS = 6;

export interface WalletHomeOnboardingFundRampPriorityCandidate {
  assetId: string;
  token: TokenI;
}

const EMPTY_TOKEN_IMAGE = '';

function createBuyabilityTokenStub(
  overrides: Pick<
    TokenI,
    'address' | 'chainId' | 'symbol' | 'name' | 'decimals'
  > &
    Partial<Pick<TokenI, 'isNative' | 'isETH'>>,
): TokenI {
  return {
    address: overrides.address,
    chainId: overrides.chainId,
    symbol: overrides.symbol,
    name: overrides.name,
    decimals: overrides.decimals,
    image: EMPTY_TOKEN_IMAGE,
    logo: undefined,
    balance: '0',
    isETH: overrides.isETH ?? false,
    isNative: overrides.isNative ?? false,
  };
}

/**
 * Minimal {@link TokenI} for ramp buyability checks on mainnet mUSD.
 */
export function createMainnetMusdBuyabilityToken(): TokenI {
  return createBuyabilityTokenStub({
    address: MAINNET_MUSD_TOKEN_ADDRESS,
    chainId: CHAIN_IDS.MAINNET,
    symbol: MUSD_SYMBOL,
    name: MUSD_NAME,
    decimals: MUSD_DECIMALS,
  });
}

/**
 * Minimal {@link TokenI} for ramp buyability checks on mainnet native ETH.
 */
export function createMainnetEthBuyabilityToken(): TokenI {
  return createBuyabilityTokenStub({
    address: '0x0000000000000000000000000000000000000000',
    chainId: CHAIN_IDS.MAINNET,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isETH: true,
    isNative: true,
  });
}

/** Fund-step ramp asset priority: mainnet mUSD, then mainnet native ETH. */
export const WALLET_HOME_ONBOARDING_FUND_RAMP_PRIORITY: WalletHomeOnboardingFundRampPriorityCandidate[] =
  [
    {
      assetId: MAINNET_MUSD_RAMP_ASSET_ID,
      token: createMainnetMusdBuyabilityToken(),
    },
    {
      assetId: MAINNET_ETH_RAMP_ASSET_ID,
      token: createMainnetEthBuyabilityToken(),
    },
  ];
