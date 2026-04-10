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

export const getCompatibleTronCaipChainIdsForWalletConnect = (
  caipChainId: string,
): string[] => {
  if (!caipChainId.startsWith(`${KnownCaipNamespace.Tron}:`)) {
    return [caipChainId];
  }

  const inboundNormalized =
    normalizeCaipChainIdInboundForWalletConnect(caipChainId);
  const outboundNormalized =
    normalizeCaipChainIdOutboundForWalletConnect(caipChainId);

  return Array.from(
    new Set([caipChainId, inboundNormalized, outboundNormalized]),
  );
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

interface SnapMappedRequest {
  method: string;
  params: unknown;
}

const extractTronRawDataHex = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as {
    raw_data_hex?: unknown;
    rawDataHex?: unknown;
    transaction?: unknown;
    tx?: unknown;
  };

  if (typeof candidate.raw_data_hex === 'string') {
    return candidate.raw_data_hex;
  }
  if (typeof candidate.rawDataHex === 'string') {
    return candidate.rawDataHex;
  }
  return (
    extractTronRawDataHex(candidate.transaction) ??
    extractTronRawDataHex(candidate.tx)
  );
};

const extractTronType = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as {
    type?: unknown;
    transaction?: unknown;
    tx?: unknown;
    raw_data?: { contract?: { type?: unknown }[] };
  };

  if (typeof candidate.type === 'string' && candidate.type.length > 0) {
    return candidate.type;
  }
  const contractType = candidate.raw_data?.contract?.[0]?.type;
  if (typeof contractType === 'string' && contractType.length > 0) {
    return contractType;
  }
  return (
    extractTronType(candidate.transaction) ?? extractTronType(candidate.tx)
  );
};

/**
 * Adapts WalletConnect Tron methods to the canonical Tron Snap RPC surface.
 * Non-Tron methods are passed through unchanged.
 */
export const adaptWalletConnectRequestForSnap = ({
  method,
  params,
}: {
  method: string;
  params: unknown;
}): SnapMappedRequest => {
  const firstParam = Array.isArray(params)
    ? params.length > 0
      ? params[0]
      : undefined
    : params && typeof params === 'object'
      ? params
      : undefined;

  if (method === 'tron_signMessage') {
    const mappedParams: Record<string, string> = {};
    const address =
      firstParam && typeof firstParam === 'object' && 'address' in firstParam
        ? firstParam.address
        : undefined;
    const message =
      firstParam && typeof firstParam === 'object' && 'message' in firstParam
        ? firstParam.message
        : undefined;
    if (typeof address === 'string') {
      mappedParams.address = address;
    }
    if (typeof message === 'string') {
      mappedParams.message = message;
    }

    return {
      method: 'signMessage',
      params: mappedParams,
    };
  }

  if (method === 'tron_signTransaction') {
    const transaction =
      firstParam &&
      typeof firstParam === 'object' &&
      'transaction' in firstParam
        ? (firstParam.transaction as
            | {
                raw_data_hex?: string;
                rawDataHex?: string;
                type?: string;
              }
            | undefined)
        : (firstParam as
            | {
                raw_data_hex?: string;
                rawDataHex?: string;
                type?: string;
              }
            | undefined);

    const rawDataHex = extractTronRawDataHex(firstParam ?? transaction);
    const type = extractTronType(firstParam ?? transaction);

    const mappedTransaction: Record<string, string> = {};
    if (typeof rawDataHex === 'string') {
      mappedTransaction.rawDataHex = rawDataHex;
    }
    if (typeof type === 'string') {
      mappedTransaction.type = type;
    }

    const mappedParams: {
      address?: string;
      transaction: Record<string, string>;
    } = {
      transaction: mappedTransaction,
    };
    const address =
      firstParam && typeof firstParam === 'object' && 'address' in firstParam
        ? firstParam.address
        : undefined;
    if (typeof address === 'string') {
      mappedParams.address = address;
    }

    return {
      method: 'signTransaction',
      params: mappedParams,
    };
  }

  return { method, params };
};
