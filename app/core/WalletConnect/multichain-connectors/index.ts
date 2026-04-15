import { adaptWalletConnectRequestForSnap as adaptTronRequestForSnap } from './tron';

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

type ConnectorAdapter = (input: {
  method: string;
  params: unknown;
}) => SnapMappedRequest;

const CONNECTOR_BY_METHOD: Record<string, ConnectorAdapter> = {
  tron_getBalance: adaptTronRequestForSnap,
  tron_signMessage: adaptTronRequestForSnap,
  tron_signTransaction: adaptTronRequestForSnap,
  tron_sendTransaction: adaptTronRequestForSnap,
};

export const adaptWalletConnectRequestForSnap = ({
  method,
  params,
}: {
  method: string;
  params: unknown;
}): SnapMappedRequest => {
  const adapter = CONNECTOR_BY_METHOD[method];
  if (!adapter) {
    return { method, params };
  }
  return adapter({ method, params });
};
