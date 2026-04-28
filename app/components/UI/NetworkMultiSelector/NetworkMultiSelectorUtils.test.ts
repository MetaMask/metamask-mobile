import type { NetworkConfiguration } from '@metamask/network-controller';
import type { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import { SolScope } from '@metamask/keyring-api';
import type { CaipChainId, Hex } from '@metamask/utils';
import {
  resolveNetworkDisplayName,
  type CurrentSelectedNetworkForDisplayName,
} from './NetworkMultiSelectorUtils';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const UNKNOWN = 'network_information.unknown_network';

describe('resolveNetworkDisplayName', () => {
  const emptyEvm = {} as Record<Hex, NetworkConfiguration>;
  const emptyNonEvm = {} as Record<CaipChainId, MultichainNetworkConfiguration>;

  it('returns unknown_network when chainId is null', () => {
    const result = resolveNetworkDisplayName({
      chainId: null,
      evmNetworkConfigurations: emptyEvm,
      nonEvmNetworkConfigurations: emptyNonEvm,
    });

    expect(result).toBe(UNKNOWN);
  });

  it('returns currentSelectedNetwork name when chainId equals caipChainId', () => {
    const current: CurrentSelectedNetworkForDisplayName = {
      caipChainId: SolScope.Mainnet,
      name: 'Solana Mainnet',
    };

    const result = resolveNetworkDisplayName({
      chainId: SolScope.Mainnet,
      evmNetworkConfigurations: emptyEvm,
      nonEvmNetworkConfigurations: emptyNonEvm,
      currentSelectedNetwork: current,
    });

    expect(result).toBe('Solana Mainnet');
  });

  it('returns currentSelectedNetwork name when chainId is hex matching selected eip155 caip', () => {
    const current: CurrentSelectedNetworkForDisplayName = {
      caipChainId: 'eip155:1' as CaipChainId,
      name: 'Ethereum',
    };

    const result = resolveNetworkDisplayName({
      chainId: '0x1',
      evmNetworkConfigurations: emptyEvm,
      nonEvmNetworkConfigurations: emptyNonEvm,
      currentSelectedNetwork: current,
    });

    expect(result).toBe('Ethereum');
  });

  it('returns EVM network name for 0x chainId from configurations', () => {
    const polygonHex = '0x89' as Hex;
    const evm = {
      [polygonHex]: { name: 'Polygon', chainId: polygonHex },
    } as Record<Hex, NetworkConfiguration>;

    const result = resolveNetworkDisplayName({
      chainId: polygonHex,
      evmNetworkConfigurations: evm,
      nonEvmNetworkConfigurations: emptyNonEvm,
    });

    expect(result).toBe('Polygon');
  });

  it('returns unknown_network for 0x chainId missing from configurations', () => {
    const result = resolveNetworkDisplayName({
      chainId: '0x9999' as Hex,
      evmNetworkConfigurations: emptyEvm,
      nonEvmNetworkConfigurations: emptyNonEvm,
    });

    expect(result).toBe(UNKNOWN);
  });

  it('returns non-EVM network name for CAIP chainId from configurations', () => {
    const solanaMainnet = SolScope.Mainnet;
    const nonEvm = {
      [solanaMainnet]: {
        chainId: solanaMainnet,
        name: 'Solana',
      } as unknown as MultichainNetworkConfiguration,
    };

    const result = resolveNetworkDisplayName({
      chainId: solanaMainnet,
      evmNetworkConfigurations: emptyEvm,
      nonEvmNetworkConfigurations: nonEvm,
    });

    expect(result).toBe('Solana');
  });

  it('returns unknown_network when non-EVM configuration omits name', () => {
    const solanaMainnet = SolScope.Mainnet;
    const nonEvm = {
      [solanaMainnet]: {
        chainId: solanaMainnet,
      } as unknown as MultichainNetworkConfiguration,
    };

    const result = resolveNetworkDisplayName({
      chainId: solanaMainnet,
      evmNetworkConfigurations: emptyEvm,
      nonEvmNetworkConfigurations: nonEvm,
    });

    expect(result).toBe(UNKNOWN);
  });

  it('returns EVM name when chainId is eip155 CAIP string', () => {
    const mainnetHex = '0x1' as Hex;
    const evm = {
      [mainnetHex]: { name: 'Ethereum Mainnet', chainId: mainnetHex },
    } as Record<Hex, NetworkConfiguration>;

    const result = resolveNetworkDisplayName({
      chainId: 'eip155:1',
      evmNetworkConfigurations: evm,
      nonEvmNetworkConfigurations: emptyNonEvm,
    });

    expect(result).toBe('Ethereum Mainnet');
  });

  it('returns unknown_network when chainId is not solvable', () => {
    const result = resolveNetworkDisplayName({
      chainId: 'not-a-caip-id',
      evmNetworkConfigurations: emptyEvm,
      nonEvmNetworkConfigurations: emptyNonEvm,
    });

    expect(result).toBe(UNKNOWN);
  });

  it('prefers currentSelectedNetwork over evm map when both match hex', () => {
    const mainnetHex = '0x1' as Hex;
    const evm = {
      [mainnetHex]: { name: 'From Map', chainId: mainnetHex },
    } as Record<Hex, NetworkConfiguration>;
    const current: CurrentSelectedNetworkForDisplayName = {
      caipChainId: 'eip155:1' as CaipChainId,
      name: 'From Selection',
    };

    const result = resolveNetworkDisplayName({
      chainId: mainnetHex,
      evmNetworkConfigurations: evm,
      nonEvmNetworkConfigurations: emptyNonEvm,
      currentSelectedNetwork: current,
    });

    expect(result).toBe('From Selection');
  });
});
