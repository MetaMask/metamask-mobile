import { KnownCaipNamespace } from '@metamask/utils';
import {
  getAdapter,
  getAdapterForCaipChainId,
  getAdapterForMethod,
  getAllAdapters,
} from './registry';

describe('multichain registry', () => {
  it('exposes the eip155 adapter', () => {
    const adapter = getAdapter(KnownCaipNamespace.Eip155);
    expect(adapter?.namespace).toBe('eip155');
    expect(adapter?.methods).toEqual(expect.arrayContaining(['personal_sign']));
    expect(adapter?.events).toEqual(
      expect.arrayContaining(['chainChanged', 'accountsChanged']),
    );
  });

  it('does not route eip155 RPC methods through snap adapters', () => {
    expect(getAdapterForMethod('personal_sign')).toBeUndefined();
    expect(getAdapterForMethod('eth_sendTransaction')).toBeUndefined();
  });

  it('returns undefined for unknown namespaces', () => {
    expect(getAdapter('solana')).toBeUndefined();
    expect(getAdapterForCaipChainId('solana:mainnet')).toBeUndefined();
  });

  it('returns undefined for empty or malformed chain ids', () => {
    expect(getAdapterForCaipChainId('')).toBeUndefined();
  });

  it('includes eip155 in the full list of adapters', () => {
    const namespaces = getAllAdapters().map((adapter) => adapter.namespace);
    expect(namespaces).toContain(KnownCaipNamespace.Eip155);
  });
});
