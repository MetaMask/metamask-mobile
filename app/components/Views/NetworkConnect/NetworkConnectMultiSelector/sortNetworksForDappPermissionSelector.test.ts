import { KnownCaipNamespace } from '@metamask/utils';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import {
  getInScopeNamespacesForDappPermissionSelector,
  sortNetworksForDappPermissionSelector,
} from './sortNetworksForDappPermissionSelector';

const networks = [
  { caipChainId: 'eip155:11155111' as const, name: 'Sepolia' },
  { caipChainId: BtcScope.Mainnet, name: 'Bitcoin' },
  { caipChainId: 'eip155:137' as const, name: 'Polygon' },
  { caipChainId: SolScope.Mainnet, name: 'Solana' },
  { caipChainId: 'eip155:1' as const, name: 'Ethereum Mainnet' },
  { caipChainId: 'eip155:59141' as const, name: 'Linea Sepolia' },
];

describe('sortNetworksForDappPermissionSelector', () => {
  it('puts eip155 mainnets before other namespaces and testnets when eip155 is requested', () => {
    const sorted = sortNetworksForDappPermissionSelector(networks, {
      preferredChainIds: ['eip155:1', SolScope.Mainnet],
      requestedNamespaces: [KnownCaipNamespace.Eip155],
    });

    // Solana is preferred but out of eip155 scope, so it leads the "other" tier.
    expect(sorted.map((network) => network.name)).toEqual([
      'Ethereum Mainnet',
      'Polygon',
      'Solana',
      'Bitcoin',
      'Linea Sepolia',
      'Sepolia',
    ]);
  });

  it('expands selected chain namespaces when request scopes are absent', () => {
    const sorted = sortNetworksForDappPermissionSelector(networks, {
      preferredChainIds: ['eip155:1'],
    });

    expect(sorted.map((network) => network.name)).toEqual([
      'Ethereum Mainnet',
      'Polygon',
      'Bitcoin',
      'Solana',
      'Linea Sepolia',
      'Sepolia',
    ]);
  });

  it('derives in-scope namespaces from requested chain ids', () => {
    const sorted = sortNetworksForDappPermissionSelector(networks, {
      preferredChainIds: [],
      requestedCaipChainIds: ['eip155:137'],
    });

    expect(sorted.map((network) => network.name)).toEqual([
      'Polygon',
      'Ethereum Mainnet',
      'Bitcoin',
      'Solana',
      'Linea Sepolia',
      'Sepolia',
    ]);
  });

  it('keeps preferred chain order within the in-scope tier', () => {
    const sorted = sortNetworksForDappPermissionSelector(networks, {
      preferredChainIds: ['eip155:137', 'eip155:1'],
      requestedNamespaces: [KnownCaipNamespace.Eip155],
    });

    expect(sorted.map((network) => network.name).slice(0, 2)).toEqual([
      'Polygon',
      'Ethereum Mainnet',
    ]);
  });
});

describe('getInScopeNamespacesForDappPermissionSelector', () => {
  it('prefers requestedNamespaces over chain-derived namespaces', () => {
    const namespaces = getInScopeNamespacesForDappPermissionSelector({
      preferredChainIds: [SolScope.Mainnet],
      requestedCaipChainIds: ['eip155:1'],
      requestedNamespaces: [KnownCaipNamespace.Eip155],
    });

    expect([...namespaces]).toEqual([KnownCaipNamespace.Eip155]);
  });
});
