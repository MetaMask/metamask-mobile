jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountsController: { listAccounts: jest.fn(() => []) },
      PermissionController: { getCaveat: jest.fn(() => undefined) },
    },
  },
}));

jest.mock('../../Permissions', () => ({
  __esModule: true,
  getPermittedAccounts: jest.fn(() => []),
  getPermittedChains: jest.fn(async () => []),
  addPermittedAccounts: jest.fn(),
}));

import { KnownCaipNamespace } from '@metamask/utils';
import { getPermittedAccounts, getPermittedChains } from '../../Permissions';
import Engine from '../../Engine';
import {
  buildApprovedNamespaces,
  collectRequestedNamespaceKeys,
  filterToRequestedNamespaces,
  isEmptyApprovedNamespaces,
  mergeApprovedWithSession,
  normalizeSessionNamespaces,
  resolveProposalNamespaceKey,
} from './namespaces';
import type { ProposalLike } from './types';

const permittedAccountsMock = getPermittedAccounts as jest.Mock;
const permittedChainsMock = getPermittedChains as jest.Mock;
const listAccountsMock = (
  Engine as unknown as {
    context: { AccountsController: { listAccounts: jest.Mock } };
  }
).context.AccountsController.listAccounts;
const getCaveatMock = (
  Engine as unknown as {
    context: { PermissionController: { getCaveat: jest.Mock } };
  }
).context.PermissionController.getCaveat;

beforeEach(() => {
  jest.clearAllMocks();
  permittedAccountsMock.mockReturnValue([]);
  permittedChainsMock.mockResolvedValue([]);
  listAccountsMock.mockReturnValue([]);
  getCaveatMock.mockReturnValue(undefined);
});

describe('resolveProposalNamespaceKey', () => {
  it('returns the namespace segment for a plain scope key', () => {
    expect(resolveProposalNamespaceKey('eip155')).toBe('eip155');
  });

  it('unwraps a delegated wallet: scope', () => {
    expect(resolveProposalNamespaceKey('wallet:eip155')).toBe('eip155');
  });

  it('returns undefined for a bare wallet: scope', () => {
    expect(resolveProposalNamespaceKey('wallet:')).toBeUndefined();
  });

  it('returns the namespace prefix for a CAIP-2 chain id', () => {
    expect(resolveProposalNamespaceKey('tron:0x2b6653dc')).toBe('tron');
  });

  it('returns undefined for empty input', () => {
    expect(resolveProposalNamespaceKey('')).toBeUndefined();
  });
});

describe('collectRequestedNamespaceKeys', () => {
  it('collects top-level scope keys from both required and optional', () => {
    const proposal: ProposalLike = {
      requiredNamespaces: { eip155: { chains: ['eip155:1'] } },
      optionalNamespaces: { tron: { chains: ['tron:0x2b6653dc'] } },
    };
    expect([...collectRequestedNamespaceKeys(proposal)]).toEqual(
      expect.arrayContaining(['eip155', 'tron']),
    );
  });

  it('resolves wallet:eip155 scope keys to eip155', () => {
    const proposal: ProposalLike = {
      requiredNamespaces: {
        'wallet:eip155': { chains: ['wallet:eip155'] },
      },
    };
    expect([...collectRequestedNamespaceKeys(proposal)]).toEqual(
      expect.arrayContaining(['eip155']),
    );
  });

  it('infers namespaces from bare CAIP-2 chain ids even without a scope key', () => {
    const proposal: ProposalLike = {
      optionalNamespaces: {
        foo: { chains: ['tron:0x94a9059e'] },
      },
    };
    expect([...collectRequestedNamespaceKeys(proposal)]).toEqual(
      expect.arrayContaining(['foo', 'tron']),
    );
  });

  it('returns an empty set for an empty proposal', () => {
    expect([...collectRequestedNamespaceKeys({})]).toEqual([]);
  });
});

describe('buildApprovedNamespaces', () => {
  it('returns only namespaces requested in the proposal', async () => {
    permittedChainsMock.mockResolvedValue(['eip155:1']);
    permittedAccountsMock.mockReturnValue(['0xabc']);

    const proposal: ProposalLike = {
      requiredNamespaces: { eip155: { chains: ['eip155:1'] } },
    };

    const namespaces = await buildApprovedNamespaces({
      proposal,
      channelId: 'channel-1',
    });

    expect(Object.keys(namespaces)).toEqual([KnownCaipNamespace.Eip155]);
    expect(namespaces.eip155.chains).toEqual(['eip155:1']);
    expect(namespaces.eip155.accounts).toEqual(['eip155:1:0xabc']);
  });

  it('returns an empty map when the proposal requests nothing we support', async () => {
    permittedChainsMock.mockResolvedValue(['eip155:1']);
    permittedAccountsMock.mockReturnValue(['0xabc']);

    const namespaces = await buildApprovedNamespaces({
      proposal: { optionalNamespaces: { solana: { chains: ['solana:1'] } } },
      channelId: 'channel-1',
    });

    expect(namespaces).toEqual({});
  });

  it('skips eip155 when there are no permitted eip155 chains', async () => {
    permittedChainsMock.mockResolvedValue([]);
    permittedAccountsMock.mockReturnValue(['0xabc']);

    const namespaces = await buildApprovedNamespaces({
      proposal: { requiredNamespaces: { eip155: { chains: ['eip155:1'] } } },
      channelId: 'channel-1',
    });

    expect(namespaces).toEqual({});
  });

  it('mirrors eip155 into a wallet namespace when proposal uses wallet:eip155', async () => {
    permittedChainsMock.mockResolvedValue(['eip155:1']);
    permittedAccountsMock.mockReturnValue(['0xabc']);

    const namespaces = await buildApprovedNamespaces({
      proposal: {
        requiredNamespaces: {
          'wallet:eip155': { chains: ['wallet:eip155'] },
          eip155: { chains: ['eip155:1'] },
        },
      },
      channelId: 'channel-1',
    });

    expect(namespaces.wallet).toEqual({
      chains: ['wallet:eip155'],
      methods: namespaces.eip155.methods,
      events: namespaces.eip155.events,
      accounts: ['wallet:eip155:0xabc'],
    });
  });
});

describe('filterToRequestedNamespaces', () => {
  const makeNamespace = (chain: string) => ({
    chains: [chain],
    methods: [],
    events: [],
    accounts: [],
  });

  it('drops namespaces not mentioned in the proposal', () => {
    const result = filterToRequestedNamespaces(
      {
        eip155: makeNamespace('eip155:1'),
        tron: makeNamespace('tron:0x2b6653dc'),
      },
      { requiredNamespaces: { eip155: { chains: ['eip155:1'] } } },
    );
    expect(Object.keys(result)).toEqual(['eip155']);
  });

  it('preserves keys passed via preserveKeys', () => {
    const result = filterToRequestedNamespaces(
      {
        eip155: makeNamespace('eip155:1'),
        tron: makeNamespace('tron:0x2b6653dc'),
      },
      { requiredNamespaces: { eip155: { chains: ['eip155:1'] } } },
      { preserveKeys: ['tron'] },
    );
    expect(Object.keys(result).sort()).toEqual(['eip155', 'tron']);
  });

  it('keeps the wallet namespace when the proposal used a delegated wallet scope', () => {
    const result = filterToRequestedNamespaces(
      {
        eip155: makeNamespace('eip155:1'),
        wallet: makeNamespace('wallet:eip155'),
      },
      {
        requiredNamespaces: {
          'wallet:eip155': { chains: ['wallet:eip155'] },
          eip155: { chains: ['eip155:1'] },
        },
      },
    );
    expect(Object.keys(result).sort()).toEqual(['eip155', 'wallet']);
  });

  it('returns everything when the proposal is empty', () => {
    const result = filterToRequestedNamespaces(
      { eip155: makeNamespace('eip155:1') },
      {},
    );
    expect(Object.keys(result)).toEqual(['eip155']);
  });
});

describe('normalizeSessionNamespaces', () => {
  it('derives chains from account CAIP-10 prefixes when chains is missing', () => {
    const normalized = normalizeSessionNamespaces({
      eip155: {
        chains: [] as string[],
        methods: [],
        events: [],
        accounts: ['eip155:1:0xabc', 'eip155:137:0xdef'],
      },
    });
    expect(normalized.eip155.chains.sort()).toEqual(['eip155:1', 'eip155:137']);
  });

  it('fills in empty arrays for missing methods/events/accounts', () => {
    const normalized = normalizeSessionNamespaces({
      eip155: { chains: ['eip155:1'] } as never,
    });
    expect(normalized.eip155).toEqual({
      chains: ['eip155:1'],
      methods: [],
      events: [],
      accounts: [],
    });
  });

  it('returns an empty object when input is undefined', () => {
    expect(normalizeSessionNamespaces(undefined)).toEqual({});
  });
});

describe('mergeApprovedWithSession', () => {
  it('overwrites overlapping keys with the freshly-computed values', () => {
    const merged = mergeApprovedWithSession(
      {
        eip155: {
          chains: ['eip155:1'],
          methods: [],
          events: [],
          accounts: ['eip155:1:0xOLD'],
        },
      },
      {
        eip155: {
          chains: ['eip155:1', 'eip155:137'],
          methods: ['personal_sign'],
          events: ['chainChanged'],
          accounts: ['eip155:1:0xNEW'],
        },
      },
    );
    expect(merged.eip155.accounts).toEqual(['eip155:1:0xNEW']);
    expect(merged.eip155.chains).toEqual(['eip155:1', 'eip155:137']);
  });

  it('preserves keys only in the current session', () => {
    const merged = mergeApprovedWithSession(
      {
        tron: {
          chains: ['tron:0x2b6653dc'],
          methods: [],
          events: [],
          accounts: [],
        },
      },
      {
        eip155: {
          chains: ['eip155:1'],
          methods: [],
          events: [],
          accounts: [],
        },
      },
    );
    expect(Object.keys(merged).sort()).toEqual(['eip155', 'tron']);
  });
});

describe('isEmptyApprovedNamespaces', () => {
  it('returns true when every namespace has empty chains', () => {
    expect(
      isEmptyApprovedNamespaces({
        eip155: { chains: [], methods: [], events: [], accounts: [] },
      }),
    ).toBe(true);
  });

  it('returns false when any namespace has chains', () => {
    expect(
      isEmptyApprovedNamespaces({
        eip155: {
          chains: ['eip155:1'],
          methods: [],
          events: [],
          accounts: [],
        },
      }),
    ).toBe(false);
  });

  it('returns true for an empty map', () => {
    expect(isEmptyApprovedNamespaces({})).toBe(true);
  });
});
