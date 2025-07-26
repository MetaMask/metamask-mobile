export type { Region } from '../../../../../reducers/fiatOrders/types';
export { RampType } from '../../../../../reducers/fiatOrders/types';

export * from './analytics';

export enum PROVIDER_LINKS {
  HOMEPAGE = 'Homepage',
  PRIVACY_POLICY = 'Privacy Policy',
  SUPPORT = 'Support',
  TOS = 'Terms of Service',
}

export interface QuickAmount {
  value: number;
  label: string;
  isNative?: boolean;
}

export interface RampIntent {
  address?: string;
  chainId?: string;
  amount?: string;
  currency?: string;
  assetId?: string;
}

import {
  CaipChainId,
  CaipAssetType,
  isCaipChainId,
  isCaipAssetType,
  parseCaipChainId,
  parseCaipAssetType,
  toCaipChainId,
  isHexString,
  Hex,
} from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { SolScope } from '@metamask/keyring-api';

export const SOLANA_NETWORK = SolScope.Mainnet;
export const SOLANA_ASSET_ID = `${SolScope.Mainnet}/slip44:501`;

export function isCAIP19Format(chainId: string): boolean {
  return isCaipChainId(chainId as CaipChainId);
}

export function isSolanaNetwork(chainId: string): boolean {
  return chainId === SOLANA_NETWORK;
}

export function isLegacyEVMFormat(chainId: string): boolean {
  return /^\d+$/.test(chainId);
}

export function parseLegacyCurrencyFormat(currency: string): { chainId: string; address: string } | null {
  const parts = currency.split('/');
  if (parts.length !== 2) return null;
  
  const [chainId, address] = parts;
  
  if (!isLegacyEVMFormat(chainId)) return null;
  
  if (!isHexString(address)) return null;
  
  return { chainId, address };
}

export function parseCAIP19AssetId(assetId: string): {
  namespace: string;
  chainId: string;
  assetNamespace: string;
  assetReference: string;
  assetType?: string;
} | null {
  if (!isCaipAssetType(assetId as CaipAssetType)) {
    return null;
  }

  try {
    const parsed = parseCaipAssetType(assetId as CaipAssetType);
    const chainParsed = parseCaipChainId(parsed.chainId as CaipChainId);
    return {
      namespace: chainParsed.namespace,
      chainId: chainParsed.reference,
      assetNamespace: parsed.assetNamespace,
      assetReference: parsed.assetReference,
    };
  } catch {
    return null;
  }
}

function parseChainIdSafely(chainId: string): { namespace: string; reference: string } | null {
  if (!isCaipChainId(chainId as CaipChainId)) return null;
  
  try {
    return parseCaipChainId(chainId as CaipChainId);
  } catch {
    return null;
  }
}

function getEVMChainId(chainId: string): string | null {
  if (isLegacyEVMFormat(chainId)) return chainId;
  
  const parsed = parseChainIdSafely(chainId);
  return parsed?.namespace === 'eip155' ? parsed.reference : null;
}

export function areChainIdsEqual(chainId1: string, chainId2: string): boolean {
  if (chainId1 === chainId2) return true;

  const parsed1 = parseChainIdSafely(chainId1);
  const parsed2 = parseChainIdSafely(chainId2);
  
  if (parsed1 && parsed2) {
    return parsed1.namespace === parsed2.namespace && parsed1.reference === parsed2.reference;
  }

  if (isLegacyEVMFormat(chainId1) && isLegacyEVMFormat(chainId2)) {
    return chainId1 === chainId2;
  }

  // Mixed format comparison (legacy EVM vs CAIP-19)
  const evmChainId1 = getEVMChainId(chainId1);
  const evmChainId2 = getEVMChainId(chainId2);
  
  if (evmChainId1 && evmChainId2) {
    return evmChainId1 === evmChainId2;
  }

  return false;
}

export function extractNumericChainId(chainId: string): string | null {
  return getEVMChainId(chainId);
}

export function toCAIP19ChainId(chainId: string): string {
  if (isLegacyEVMFormat(chainId)) {
    return toCaipChainId('eip155', chainId);
  }
  return chainId;
}

export function hexToCAIP19ChainId(chainId: string): string {
  if (isHexString(chainId)) {
    return toEvmCaipChainId(chainId as Hex);
  }
  return chainId;
}
