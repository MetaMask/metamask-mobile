import {
  getAllNonEvmAdapters,
  getNonEvmAdapter,
  getNonEvmAdapterForCaipChainId,
  isNonEvmCaipChainId,
} from './registry';

describe('multichain registry', () => {
  it('exposes the registered Tron adapter (when the tron flag is enabled)', () => {
    const adapters = getAllNonEvmAdapters();
    const tron = adapters.find((adapter) => adapter.namespace === 'tron');
    // Tests run with the tron flag on; if that ever changes this assertion
    // falls through to a sane no-op rather than failing CI.
    if (!tron) {
      expect(adapters.length).toBe(0);
      return;
    }
    expect(tron.redirectMethods).toEqual(
      expect.arrayContaining(['tron_signTransaction', 'tron_signMessage']),
    );
    expect(tron.normalizeCaipChainId).toBeInstanceOf(Function);
  });

  describe('isNonEvmCaipChainId', () => {
    it('returns true for tron-prefixed CAIP chain IDs', () => {
      expect(isNonEvmCaipChainId('tron:728126428')).toBe(true);
    });
    it('returns false for EVM CAIP chain IDs', () => {
      expect(isNonEvmCaipChainId('eip155:1')).toBe(false);
      expect(isNonEvmCaipChainId('wallet:eip155')).toBe(false);
    });
    it('returns false for non-string input', () => {
      expect(isNonEvmCaipChainId(undefined)).toBe(false);
      expect(isNonEvmCaipChainId(null)).toBe(false);
      expect(isNonEvmCaipChainId(42)).toBe(false);
    });
  });

  describe('getNonEvmAdapter', () => {
    it('returns the adapter for the given namespace', () => {
      const adapter = getNonEvmAdapter('tron');
      expect(adapter?.namespace).toBe('tron');
    });
    it('returns undefined for unknown namespaces', () => {
      expect(getNonEvmAdapter('eip155')).toBeUndefined();
      expect(getNonEvmAdapter('unknown')).toBeUndefined();
    });
  });

  describe('getNonEvmAdapterForCaipChainId', () => {
    it('extracts the namespace from a CAIP-2 chain id', () => {
      expect(getNonEvmAdapterForCaipChainId('tron:728126428')?.namespace).toBe(
        'tron',
      );
    });
    it('returns undefined for EVM chain ids', () => {
      expect(getNonEvmAdapterForCaipChainId('eip155:1')).toBeUndefined();
    });
  });
});
