import {
  addNonEvmNamespacesIfRequested,
  proposalReferencesNamespace,
} from './namespaces';
import type { NonEvmChainAdapter } from './types';

const mockAdapters: NonEvmChainAdapter[] = [];
jest.mock('./registry', () => ({
  getAllNonEvmAdapters: () => mockAdapters,
}));

jest.mock('../../SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

const buildMockAdapter = (
  overrides: Partial<NonEvmChainAdapter> & { namespace: string },
): NonEvmChainAdapter => ({
  redirectMethods: [],
  buildNamespaceSlice: jest.fn().mockReturnValue(undefined),
  ...overrides,
});

beforeEach(() => {
  mockAdapters.splice(0, mockAdapters.length);
});

describe('proposalReferencesNamespace', () => {
  it('matches a top-level scope key', () => {
    expect(
      proposalReferencesNamespace(
        { requiredNamespaces: { tron: { chains: [] } } },
        'tron',
      ),
    ).toBe(true);
  });
  it('matches a bare CAIP-2 chain prefix', () => {
    expect(
      proposalReferencesNamespace(
        {
          optionalNamespaces: {
            wallet: { chains: ['tron:728126428'] },
          },
        },
        'tron',
      ),
    ).toBe(true);
  });
  it('returns false when the proposal does not reference the namespace', () => {
    expect(
      proposalReferencesNamespace(
        { requiredNamespaces: { eip155: { chains: ['eip155:1'] } } },
        'tron',
      ),
    ).toBe(false);
  });
});

describe('addNonEvmNamespacesIfRequested', () => {
  it('does nothing when no adapter matches the proposal', () => {
    const tron = buildMockAdapter({
      namespace: 'tron',
      buildNamespaceSlice: jest.fn().mockReturnValue({
        chains: ['tron:728126428'],
        methods: [],
        events: [],
        accounts: [],
      }),
    });
    mockAdapters.push(tron);

    const namespaces = {} as Record<string, never>;
    addNonEvmNamespacesIfRequested({
      namespaces,
      proposal: {
        requiredNamespaces: { eip155: { chains: ['eip155:1'] } },
      },
      channelId: 'channel',
    });

    expect(namespaces).toEqual({});
    expect(tron.buildNamespaceSlice).not.toHaveBeenCalled();
  });

  it('runs onBeforeApprove and injects the slice when the proposal asks for it', () => {
    const slice = {
      chains: ['tron:728126428'],
      methods: ['tron_signTransaction'],
      events: [],
      accounts: ['tron:728126428:TX'],
    };
    const onBeforeApprove = jest.fn();
    const tron = buildMockAdapter({
      namespace: 'tron',
      onBeforeApprove,
      buildNamespaceSlice: jest.fn().mockReturnValue(slice),
    });
    mockAdapters.push(tron);

    const namespaces: Record<string, unknown> = {};
    addNonEvmNamespacesIfRequested({
      namespaces: namespaces as never,
      proposal: {
        optionalNamespaces: { tron: { chains: ['tron:728126428'] } },
      },
      channelId: 'channel',
    });

    expect(onBeforeApprove).toHaveBeenCalledWith(
      expect.objectContaining({ channelId: 'channel' }),
    );
    expect(namespaces.tron).toBe(slice);
  });

  it('skips an adapter that incorrectly registers under eip155', () => {
    const eip155Adapter = buildMockAdapter({
      namespace: 'eip155',
      buildNamespaceSlice: jest.fn().mockReturnValue({
        chains: ['eip155:1'],
        methods: [],
        events: [],
        accounts: [],
      }),
    });
    mockAdapters.push(eip155Adapter);

    const namespaces = {} as Record<string, never>;
    addNonEvmNamespacesIfRequested({
      namespaces,
      proposal: {
        requiredNamespaces: { eip155: { chains: ['eip155:1'] } },
      },
      channelId: 'channel',
    });

    expect(eip155Adapter.buildNamespaceSlice).not.toHaveBeenCalled();
    expect(namespaces).toEqual({});
  });

  it('continues when onBeforeApprove throws', () => {
    const slice = {
      chains: ['tron:728126428'],
      methods: [],
      events: [],
      accounts: [],
    };
    const tron = buildMockAdapter({
      namespace: 'tron',
      onBeforeApprove: jest.fn(() => {
        throw new Error('seed failed');
      }),
      buildNamespaceSlice: jest.fn().mockReturnValue(slice),
    });
    mockAdapters.push(tron);

    const namespaces: Record<string, unknown> = {};
    addNonEvmNamespacesIfRequested({
      namespaces: namespaces as never,
      proposal: {
        requiredNamespaces: { tron: { chains: ['tron:728126428'] } },
      },
      channelId: 'channel',
    });

    expect(namespaces.tron).toBe(slice);
  });
});
