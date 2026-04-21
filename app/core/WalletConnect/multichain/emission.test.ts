import { getChainChangedEmission, shouldEmitChainChanged } from './emission';

describe('getChainChangedEmission', () => {
  const fallback = { fallbackEvmDecimal: 1, fallbackEvmHex: '0x1' };

  it('prefers the first non-EVM namespace chain', () => {
    expect(
      getChainChangedEmission({
        namespaces: {
          eip155: {
            chains: ['eip155:1'],
            methods: [],
            events: [],
            accounts: [],
          },
          tron: {
            chains: ['tron:0x2b6653dc'],
            methods: [],
            events: [],
            accounts: [],
          },
        },
        ...fallback,
      }),
    ).toEqual({ chainId: 'tron:0x2b6653dc', data: 'tron:0x2b6653dc' });
  });

  it('falls back to the first eip155 chain when no non-EVM namespace is present', () => {
    expect(
      getChainChangedEmission({
        namespaces: {
          eip155: {
            chains: ['eip155:137'],
            methods: [],
            events: [],
            accounts: [],
          },
        },
        ...fallback,
      }),
    ).toEqual({ chainId: 'eip155:137', data: '0x1' });
  });

  it('ignores the wallet mirror namespace when selecting the emission chain', () => {
    expect(
      getChainChangedEmission({
        namespaces: {
          wallet: {
            chains: ['wallet:eip155'],
            methods: [],
            events: [],
            accounts: [],
          },
          eip155: {
            chains: ['eip155:1'],
            methods: [],
            events: [],
            accounts: [],
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
          methods: [],
          events: ['chainChanged'],
          accounts: [],
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
          methods: [],
          events: ['chainChanged'],
          accounts: [],
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
          methods: [],
          events: [],
          accounts: [],
        },
      },
    });
    expect(decision.shouldEmit).toBe(false);
    expect(decision.reason).toBe('event_not_supported');
    expect(decision.namespace).toBe('tron');
    expect(decision.namespaceEvents).toEqual([]);
  });
});
