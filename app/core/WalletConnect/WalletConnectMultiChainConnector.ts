import { KnownCaipNamespace } from '@metamask/utils';
import DevLogger from '../SDKConnect/utils/DevLogger';

interface NamespacesLike {
  [namespace: string]: { chains?: string[]; events?: string[] } | undefined;
  tron?: { chains?: string[]; events?: string[] };
  eip155?: { chains?: string[]; events?: string[] };
}

export interface ChainChangedEmission {
  chainId: string;
  data: string | number;
}

export interface ChainChangedEmitDecision {
  shouldEmit: boolean;
  reason?: 'chain_not_in_session' | 'event_not_supported';
  namespace?: string;
  activeSessionChains?: string[];
  namespaceEvents?: string[];
}

export const normalizeCaipChainIdInboundForWalletConnect = (
  caipChainId: string,
): string => {
  const namespace = caipChainId.split(':')[0];

  if (namespace === KnownCaipNamespace.Tron) {
    const chainRef = caipChainId.slice('tron:'.length);
    if (chainRef.startsWith('0x')) {
      const decimalRef = parseInt(chainRef, 16);
      const normalized = `tron:${decimalRef}`;
      DevLogger.log('[wc][caip] normalize inbound tron chainId hex->dec', {
        input: caipChainId,
        output: normalized,
      });
      return normalized;
    }
  }

  return caipChainId;
};

export const normalizeCaipChainIdOutboundForWalletConnect = (
  caipChainId: string,
): string => {
  const namespace = caipChainId.split(':')[0];

  if (namespace === KnownCaipNamespace.Tron) {
    const chainRef = caipChainId.slice('tron:'.length);
    if (!chainRef.startsWith('0x')) {
      const hexRef = parseInt(chainRef, 10).toString(16);
      const normalized = `tron:0x${hexRef}`;
      DevLogger.log('[wc][caip] normalize outbound tron chainId dec->hex', {
        input: caipChainId,
        output: normalized,
      });
      return normalized;
    }
  }

  return caipChainId;
};

export const getChainChangedEmissionForWalletConnect = ({
  namespaces,
  fallbackEvmDecimal,
  fallbackEvmHex,
}: {
  namespaces?: NamespacesLike;
  fallbackEvmDecimal: number;
  fallbackEvmHex: string;
}): ChainChangedEmission => {
  const tronChain = namespaces?.tron?.chains?.[0];
  if (tronChain) {
    return {
      chainId: tronChain,
      data: tronChain,
    };
  }

  const eip155Chain = namespaces?.eip155?.chains?.[0];
  if (eip155Chain) {
    return {
      chainId: eip155Chain,
      data: fallbackEvmHex,
    };
  }

  return {
    chainId: `eip155:${fallbackEvmDecimal}`,
    data: fallbackEvmHex,
  };
};

export const shouldEmitChainChangedForWalletConnect = ({
  chainId,
  namespaces,
}: {
  chainId: string;
  namespaces?: NamespacesLike;
}): ChainChangedEmitDecision => {
  const activeSessionChains = Object.values(namespaces ?? {}).flatMap(
    (ns) => ns?.chains ?? [],
  );
  if (!activeSessionChains.includes(chainId)) {
    return {
      shouldEmit: false,
      reason: 'chain_not_in_session',
      activeSessionChains,
    };
  }

  const namespace = chainId.split(':')[0];
  const namespaceEvents = namespaces?.[namespace]?.events ?? [];
  if (!namespaceEvents.includes('chainChanged')) {
    return {
      shouldEmit: false,
      reason: 'event_not_supported',
      namespace,
      namespaceEvents,
    };
  }

  return { shouldEmit: true };
};
