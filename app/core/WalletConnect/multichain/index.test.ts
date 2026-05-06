import {
  getRedirectMethodsForChain,
  getCompatibleCaipChainIdsForWalletConnect,
  mapRequestForSnap,
  normalizeCaipChainIdInboundForWalletConnect,
  normalizeCaipChainIdOutboundForWalletConnect,
  normalizeSnapResponse,
} from './index';
import type { ChainAdapter } from './types';

jest.mock('./registry', () => ({
  getAdapter: jest.fn(),
  getAllAdapters: jest.fn().mockReturnValue([]),
  getAllRegisteredNamespaces: jest.fn().mockReturnValue([]),
}));

import { getAdapter } from './registry';

const mockedGetAdapter = getAdapter as jest.Mock;

const createFakeAdapter = (overrides: Partial<ChainAdapter>): ChainAdapter => ({
  namespace: overrides.namespace ?? 'fake',
  redirectMethods: overrides.redirectMethods ?? [],
  proposalReferencesNamespace:
    overrides.proposalReferencesNamespace ?? jest.fn().mockReturnValue(false),
  onBeforeApprove: overrides.onBeforeApprove,
  buildNamespace: overrides.buildNamespace ?? jest.fn(),
  mapRequestForSnap:
    overrides.mapRequestForSnap ??
    jest.fn().mockImplementation(({ method, params }) => ({ method, params })),
  normalizeSnapResponse:
    overrides.normalizeSnapResponse ??
    jest.fn().mockImplementation(({ result }) => result),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('mapRequestForSnap', () => {
  it('extracts the CAIP-2 namespace from the scope and looks up the adapter once', () => {
    mockedGetAdapter.mockReturnValue(undefined);

    mapRequestForSnap({
      scope: 'tron:728126428',
      method: 'tron_signTransaction',
      params: [],
    });

    expect(mockedGetAdapter).toHaveBeenCalledTimes(1);
    expect(mockedGetAdapter).toHaveBeenCalledWith('tron');
  });

  it('delegates to the matched adapter and returns the mapped request', () => {
    const adapterMapped = { method: 'signTransaction', params: { foo: 1 } };
    const fakeAdapter = createFakeAdapter({
      namespace: 'tron',
      mapRequestForSnap: jest.fn().mockReturnValue(adapterMapped),
    });
    mockedGetAdapter.mockReturnValue(fakeAdapter);

    const result = mapRequestForSnap({
      scope: 'tron:728126428',
      method: 'tron_signTransaction',
      params: [{ raw_data_hex: '0xabc' }],
    });

    expect(result).toBe(adapterMapped);
    expect(fakeAdapter.mapRequestForSnap).toHaveBeenCalledWith({
      method: 'tron_signTransaction',
      params: [{ raw_data_hex: '0xabc' }],
    });
  });

  it('returns the original method/params when no adapter is registered for the scope', () => {
    mockedGetAdapter.mockReturnValue(undefined);

    const result = mapRequestForSnap({
      scope: 'eip155:1',
      method: 'eth_sign',
      params: ['0x1', '0x2'],
    });

    expect(result).toStrictEqual({
      method: 'eth_sign',
      params: ['0x1', '0x2'],
    });
  });
});

describe('normalizeSnapResponse', () => {
  it('delegates to the matched adapter and returns its normalized result', () => {
    const adapterResult = { txID: 'tx-1', signature: ['0xsig'] };
    const fakeAdapter = createFakeAdapter({
      namespace: 'tron',
      normalizeSnapResponse: jest.fn().mockReturnValue(adapterResult),
    });
    mockedGetAdapter.mockReturnValue(fakeAdapter);

    const result = normalizeSnapResponse({
      scope: 'tron:728126428',
      method: 'tron_signTransaction',
      params: [],
      result: { signature: '0xsig' },
    });

    expect(result).toBe(adapterResult);
    expect(fakeAdapter.normalizeSnapResponse).toHaveBeenCalledWith({
      method: 'tron_signTransaction',
      params: [],
      result: { signature: '0xsig' },
    });
  });

  it('returns the raw snap result when no adapter is registered for the scope', () => {
    mockedGetAdapter.mockReturnValue(undefined);
    const snapResult = { hello: 'world' };

    const result = normalizeSnapResponse({
      scope: 'eip155:1',
      method: 'eth_sign',
      params: [],
      result: snapResult,
    });

    expect(result).toBe(snapResult);
  });
});

describe('getRedirectMethodsForChain', () => {
  it('returns the redirectMethods of the adapter for the scope namespace', () => {
    mockedGetAdapter.mockReturnValue(
      createFakeAdapter({
        namespace: 'tron',
        redirectMethods: ['tron_signTransaction', 'tron_signMessage'],
      }),
    );

    const result = getRedirectMethodsForChain('tron:728126428');

    expect(result).toStrictEqual(['tron_signTransaction', 'tron_signMessage']);
  });

  it('returns an empty array when no adapter matches the scope', () => {
    mockedGetAdapter.mockReturnValue(undefined);

    expect(getRedirectMethodsForChain('eip155:1')).toStrictEqual([]);
  });
});

describe('CAIP chain id normalization helpers', () => {
  it('normalizes tron hex chain ids inbound to decimal', () => {
    expect(normalizeCaipChainIdInboundForWalletConnect('tron:0x2b6653dc')).toBe(
      'tron:728126428',
    );
  });

  it('normalizes tron decimal chain ids outbound to hex', () => {
    expect(normalizeCaipChainIdOutboundForWalletConnect('tron:728126428')).toBe(
      'tron:0x2b6653dc',
    );
  });

  it('keeps non-numeric tron chain references unchanged outbound', () => {
    expect(normalizeCaipChainIdOutboundForWalletConnect('tron:mainnet')).toBe(
      'tron:mainnet',
    );
  });

  it('returns compatible inbound and outbound variants for tron chain ids', () => {
    expect(
      getCompatibleCaipChainIdsForWalletConnect('tron:0x2b6653dc'),
    ).toEqual(expect.arrayContaining(['tron:0x2b6653dc', 'tron:728126428']));
  });
});
