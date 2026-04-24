import {
  getChainChangedEmission,
  getEventEmissionChainId,
  shouldEmitChainChanged,
} from './emission';

describe('getChainChangedEmission', () => {
  const fallback = { fallbackEvmDecimal: 1, fallbackEvmHex: '0x1' };

  it('selects the namespace with highest emissionPriority', () => {
    // Both namespaces have no registered adapter → priority 0, eip155 wins
    // by insertion order. When a higher-priority adapter is registered (e.g.
    // Tron with priority 10), it would be selected instead.
    expect(
      getChainChangedEmission({
        namespaces: {
          eip155: {
            chains: ['eip155:1'],
            events: [],
          },
          unknown: {
            chains: ['unknown:42'],
            events: [],
          },
        },
        ...fallback,
      }),
    ).toEqual({ chainId: 'eip155:1', data: '0x1' });
  });

  it('falls back to the first eip155 chain when no non-EVM namespace is present', () => {
    expect(
      getChainChangedEmission({
        namespaces: {
          eip155: {
            chains: ['eip155:137'],
            events: [],
          },
        },
        ...fallback,
      }),
    ).toEqual({ chainId: 'eip155:137', data: '0x1' });
  });

  it('uses the target EVM chain scope when it exists in session chains', () => {
    expect(
      getChainChangedEmission({
        namespaces: {
          eip155: {
            chains: ['eip155:1', 'eip155:137'],
            events: ['chainChanged'],
          },
        },
        fallbackEvmDecimal: 137,
        fallbackEvmHex: '0x89',
      }),
    ).toEqual({ chainId: 'eip155:137', data: '0x89' });
  });

  it('ignores the wallet mirror namespace when selecting the emission chain', () => {
    expect(
      getChainChangedEmission({
        namespaces: {
          wallet: {
            chains: ['wallet:eip155'],
            events: [],
          },
          eip155: {
            chains: ['eip155:1'],
            events: [],
          },
        },
        ...fallback,
      }),
    ).toEqual({ chainId: 'eip155:1', data: '0x1' });
  });

  it('returns the EVM fallback CAIP id when nothing is available', () => {
    expect(getChainChangedEmission({ namespaces: {}, ...fallback })).toEqual({
      chainId: 'eip155:1',
      data: '0x1',
    });
  });
});

describe('shouldEmitChainChanged', () => {
  it('returns shouldEmit when chain is in the session and namespace supports chainChanged', () => {
    const decision = shouldEmitChainChanged({
      chainId: 'eip155:1',
      namespaces: {
        eip155: {
          chains: ['eip155:1'],
          events: ['chainChanged'],
        },
      },
    });
    expect(decision).toEqual({ shouldEmit: true });
  });

  it('skips emission when the chain is not present in any active slice', () => {
    const decision = shouldEmitChainChanged({
      chainId: 'eip155:42',
      namespaces: {
        eip155: {
          chains: ['eip155:1'],
          events: ['chainChanged'],
        },
      },
    });
    expect(decision.shouldEmit).toBe(false);
    expect(decision.reason).toBe('chain_not_in_session');
    expect(decision.activeSessionChains).toEqual(['eip155:1']);
  });

  it('skips emission when the namespace does not declare the chainChanged event', () => {
    const decision = shouldEmitChainChanged({
      chainId: 'tron:0x2b6653dc',
      namespaces: {
        tron: {
          chains: ['tron:0x2b6653dc'],
          events: [],
        },
      },
    });
    expect(decision.shouldEmit).toBe(false);
    expect(decision.reason).toBe('event_not_supported');
    expect(decision.namespace).toBe('tron');
    expect(decision.namespaceEvents).toEqual([]);
  });
});

describe('getEventEmissionChainId', () => {
  it('selects a chain from a namespace that supports the event', () => {
    expect(
      getEventEmissionChainId({
        eventName: 'accountsChanged',
        fallbackEvmDecimal: 1,
        namespaces: {
          tron: {
            chains: ['tron:0x2b6653dc'],
            events: ['accountsChanged'],
          },
          eip155: {
            chains: ['eip155:1'],
            events: [],
          },
        },
      }),
    ).toEqual({ chainId: 'tron:0x2b6653dc' });
  });

  it('ignores wallet mirror namespace and falls back to concrete chain', () => {
    expect(
      getEventEmissionChainId({
        eventName: 'accountsChanged',
        fallbackEvmDecimal: 1,
        namespaces: {
          wallet: {
            chains: ['wallet:eip155'],
            events: ['accountsChanged'],
          },
          eip155: {
            chains: ['eip155:137'],
            events: [],
          },
        },
      }),
    ).toEqual({ chainId: 'eip155:137' });
  });

  it('falls back to eip155 current chain when session has no chains', () => {
    expect(
      getEventEmissionChainId({
        eventName: 'accountsChanged',
        fallbackEvmDecimal: 10,
        namespaces: {},
      }),
    ).toEqual({ chainId: 'eip155:10' });
  });
});
