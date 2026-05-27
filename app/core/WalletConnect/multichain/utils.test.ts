import { KnownCaipNamespace } from '@metamask/utils';
import type { NamespaceConfig } from './types';

import {
  caipAccountIdDecimalToHex,
  caipAccountIdHexToDecimal,
  caipChainIdDecimalToHex,
  caipChainIdHexToDecimal,
  filterNamespaces,
  doesProposalOrSessionIncludeNamespace,
} from './utils';

const buildNamespace = (
  overrides: Partial<NamespaceConfig> = {},
): NamespaceConfig => ({
  chains: [],
  methods: [],
  events: [],
  accounts: [],
  ...overrides,
});

describe('multichain/utils - filterNamespaces (proposal)', () => {
  it('keeps only namespaces referenced in the proposal', () => {
    const namespaces = {
      eip155: buildNamespace({ chains: ['eip155:1'] }),
      tron: buildNamespace({ chains: ['tron:728126428'] }),
      solana: buildNamespace({ chains: ['solana:mainnet'] }),
    };

    const filtered = filterNamespaces({
      proposalOrSession: {
        requiredNamespaces: {
          eip155: {
            methods: [],
            events: [],
          },
        },
        optionalNamespaces: {
          tron: {
            methods: [],
            events: [],
          },
        },
      },
      namespaces,
    });

    expect(Object.keys(filtered).sort()).toEqual(['eip155', 'tron']);
    expect(filtered.eip155).toBe(namespaces.eip155);
    expect(filtered.tron).toBe(namespaces.tron);
  });

  it('ignores requested namespaces we cannot fulfil', () => {
    const namespaces = {
      eip155: buildNamespace({ chains: ['eip155:1'] }),
    };

    const filtered = filterNamespaces({
      proposalOrSession: {
        requiredNamespaces: {},
        optionalNamespaces: {
          tron: {
            methods: [],
            events: [],
          },
          eip155: {
            methods: [],
            events: [],
          },
        },
      },
      namespaces,
    });

    expect(Object.keys(filtered)).toEqual(['eip155']);
  });

  it('returns an empty object when nothing was requested', () => {
    expect(
      filterNamespaces({
        proposalOrSession: {
          optionalNamespaces: {},
          requiredNamespaces: {},
        },
        namespaces: { eip155: buildNamespace() },
      }),
    ).toEqual({});
  });

  it('deduplicates keys present in both required and optional', () => {
    const namespaces = {
      eip155: buildNamespace({ chains: ['eip155:1'] }),
    };

    const filtered = filterNamespaces({
      proposalOrSession: {
        requiredNamespaces: {
          eip155: {
            methods: [],
            events: [],
          },
        },
        optionalNamespaces: {
          eip155: {
            methods: [],
            events: [],
          },
        },
      },
      namespaces,
    });

    expect(Object.keys(filtered)).toEqual(['eip155']);
  });

  it('matches chain-scoped proposal keys against top-level namespace names', () => {
    const namespaces = {
      eip155: buildNamespace({ chains: ['eip155:1'] }),
    };

    const filtered = filterNamespaces({
      proposalOrSession: {
        requiredNamespaces: {
          'eip155:1': {
            methods: [],
            events: [],
          },
        },
        optionalNamespaces: {},
      },
      namespaces,
    });

    expect(Object.keys(filtered)).toEqual(['eip155']);
  });
});

describe('multichain/utils - filterNamespaces (session)', () => {
  it('keeps only namespaces approved in the active session', () => {
    const namespaces = {
      eip155: buildNamespace({ chains: ['eip155:1'] }),
      tron: buildNamespace({ chains: ['tron:728126428'] }),
      solana: buildNamespace({ chains: ['solana:mainnet'] }),
    };

    const filtered = filterNamespaces({
      proposalOrSession: {
        namespaces: {
          eip155: buildNamespace(),
          tron: buildNamespace(),
        },
      },
      namespaces,
    });

    expect(Object.keys(filtered).sort()).toEqual(['eip155', 'tron']);
    expect(filtered.eip155).toBe(namespaces.eip155);
    expect(filtered.tron).toBe(namespaces.tron);
  });

  it('ignores approved namespaces we cannot fulfil', () => {
    const namespaces = {
      eip155: buildNamespace({ chains: ['eip155:1'] }),
    };

    const filtered = filterNamespaces({
      proposalOrSession: {
        namespaces: {
          eip155: buildNamespace(),
          tron: buildNamespace(),
        },
      },
      namespaces,
    });

    expect(Object.keys(filtered)).toEqual(['eip155']);
  });

  it('returns an empty object when the session has no approved namespaces', () => {
    expect(
      filterNamespaces({
        proposalOrSession: {},
        namespaces: { eip155: buildNamespace() },
      }),
    ).toEqual({});
  });
});

describe('multichain/utils - doesProposalOrSessionIncludeNamespace', () => {
  it('returns true when a required namespace key is present without chains', () => {
    expect(
      doesProposalOrSessionIncludeNamespace({
        proposalOrSession: {
          requiredNamespaces: {
            eip155: {
              methods: ['eth_sendTransaction'],
              events: ['chainChanged'],
            },
          },
          optionalNamespaces: {},
        },
        namespace: KnownCaipNamespace.Eip155,
      }),
    ).toBe(true);
  });

  it('returns true when an optional namespace key is present with empty chains', () => {
    expect(
      doesProposalOrSessionIncludeNamespace({
        proposalOrSession: {
          requiredNamespaces: {},
          optionalNamespaces: {
            eip155: {
              chains: [],
              methods: ['eth_sendTransaction'],
              events: ['chainChanged'],
            },
          },
        },
        namespace: KnownCaipNamespace.Eip155,
      }),
    ).toBe(true);
  });

  it('returns true when a chain-scoped namespace key is present', () => {
    expect(
      doesProposalOrSessionIncludeNamespace({
        proposalOrSession: {
          requiredNamespaces: {
            'eip155:1': {
              methods: ['eth_sendTransaction'],
              events: ['chainChanged'],
            },
          },
          optionalNamespaces: {},
        },
        namespace: KnownCaipNamespace.Eip155,
      }),
    ).toBe(true);
  });

  it('returns true when only chains reference the namespace', () => {
    expect(
      doesProposalOrSessionIncludeNamespace({
        proposalOrSession: {
          requiredNamespaces: {
            wallet: {
              chains: ['eip155:1'],
              methods: ['eth_sendTransaction'],
              events: ['chainChanged'],
            },
          },
          optionalNamespaces: {},
        },
        namespace: KnownCaipNamespace.Eip155,
      }),
    ).toBe(true);
  });

  it('returns true when an active session namespace is present', () => {
    expect(
      doesProposalOrSessionIncludeNamespace({
        proposalOrSession: {
          namespaces: {
            eip155: buildNamespace({ chains: [] }),
          },
        },
        namespace: KnownCaipNamespace.Eip155,
      }),
    ).toBe(true);
  });

  it('returns false when no proposal or session entry references the namespace', () => {
    expect(
      doesProposalOrSessionIncludeNamespace({
        proposalOrSession: {
          requiredNamespaces: {
            tron: {
              methods: [],
              events: [],
            },
          },
          optionalNamespaces: {},
        },
        namespace: KnownCaipNamespace.Eip155,
      }),
    ).toBe(false);
  });
});

describe('multichain/utils - CAIP normalizers', () => {
  describe('caipChainIdHexToDecimal', () => {
    it('converts a hex reference to decimal when the namespace matches', () => {
      expect(
        caipChainIdHexToDecimal(KnownCaipNamespace.Tron, 'tron:0x2b6653dc'),
      ).toBe('tron:728126428');
    });

    it('returns the input unchanged when the namespace does not match', () => {
      expect(
        caipChainIdHexToDecimal(KnownCaipNamespace.Tron, 'eip155:0x1'),
      ).toBe('eip155:0x1');
    });

    it('is idempotent for already-decimal references', () => {
      expect(
        caipChainIdHexToDecimal(KnownCaipNamespace.Tron, 'tron:728126428'),
      ).toBe('tron:728126428');
    });

    it('passes through invalid CAIP-2 inputs', () => {
      expect(() =>
        // @ts-expect-error - intentionally malformed
        caipChainIdHexToDecimal(KnownCaipNamespace.Tron, 'not-a-caip-id'),
      ).toThrow();
    });
  });

  describe('caipChainIdDecimalToHex', () => {
    it('converts a decimal reference to hex when the namespace matches', () => {
      expect(
        caipChainIdDecimalToHex(KnownCaipNamespace.Tron, 'tron:728126428'),
      ).toBe('tron:0x2b6653dc');
    });

    it('returns the input unchanged when the namespace does not match', () => {
      expect(caipChainIdDecimalToHex(KnownCaipNamespace.Tron, 'eip155:1')).toBe(
        'eip155:1',
      );
    });

    it('is idempotent for already-hex references', () => {
      expect(
        caipChainIdDecimalToHex(KnownCaipNamespace.Tron, 'tron:0x2b6653dc'),
      ).toBe('tron:0x2b6653dc');
    });

    it('leaves non-numeric, non-hex references untouched', () => {
      // Solana mainnet — base58 reference, neither decimal nor hex.
      expect(
        caipChainIdDecimalToHex(
          KnownCaipNamespace.Solana,
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ),
      ).toBe('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
    });
  });

  describe('caipAccountIdHexToDecimal', () => {
    it('re-anchors the account on a hex→decimal-converted chain id', () => {
      expect(
        caipAccountIdHexToDecimal(
          KnownCaipNamespace.Tron,
          'tron:0x2b6653dc:TWzeSXq3pVMFRkBNzGzkbmd5DQYwTtCFGS',
        ),
      ).toBe('tron:728126428:TWzeSXq3pVMFRkBNzGzkbmd5DQYwTtCFGS');
    });

    it('returns the input unchanged when the namespace does not match', () => {
      expect(
        caipAccountIdHexToDecimal(
          KnownCaipNamespace.Tron,
          'eip155:0x1:0xa85be355bc2ceed42f916159692cf516edf7e9bd',
        ),
      ).toBe('eip155:0x1:0xa85be355bc2ceed42f916159692cf516edf7e9bd');
    });
  });

  describe('caipAccountIdDecimalToHex', () => {
    it('re-anchors the account on a decimal→hex-converted chain id', () => {
      expect(
        caipAccountIdDecimalToHex(
          KnownCaipNamespace.Tron,
          'tron:728126428:TWzeSXq3pVMFRkBNzGzkbmd5DQYwTtCFGS',
        ),
      ).toBe('tron:0x2b6653dc:TWzeSXq3pVMFRkBNzGzkbmd5DQYwTtCFGS');
    });

    it('returns the input unchanged when the namespace does not match', () => {
      expect(
        caipAccountIdDecimalToHex(
          KnownCaipNamespace.Tron,
          'eip155:1:0xa85be355bc2ceed42f916159692cf516edf7e9bd',
        ),
      ).toBe('eip155:1:0xa85be355bc2ceed42f916159692cf516edf7e9bd');
    });
  });
});
