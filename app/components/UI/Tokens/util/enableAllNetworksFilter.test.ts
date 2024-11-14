import { NETWORK_CHAIN_ID } from '../../../../util/networks/customNetworks';
import {
  enableAllNetworksFilter,
  KnownNetworkConfigurations,
} from './enableAllNetworksFilter';

describe('enableAllNetworksFilter', () => {
  it('should create a record with all network chain IDs mapped to true', () => {
    const mockNetworks = {
      [NETWORK_CHAIN_ID.ETHEREUM_MAINNET]: {
        chainId: NETWORK_CHAIN_ID.ETHEREUM_MAINNET,
        name: 'Ethereum Mainnet',
      },
      [NETWORK_CHAIN_ID.POLYGON]: {
        chainId: NETWORK_CHAIN_ID.POLYGON,
        name: 'Polygon',
      },
    };

    const result = enableAllNetworksFilter(
      mockNetworks as KnownNetworkConfigurations,
    );

    expect(result).toEqual({
      [NETWORK_CHAIN_ID.ETHEREUM_MAINNET]: true,
      [NETWORK_CHAIN_ID.POLYGON]: true,
    });
  });

  it('should handle empty networks object', () => {
    const result = enableAllNetworksFilter({});
    expect(result).toEqual({});
  });

  it('should work with NETWORK_CHAIN_ID constants', () => {
    const mockNetworks = {
      [NETWORK_CHAIN_ID.FLARE_MAINNET]: {
        chainId: NETWORK_CHAIN_ID.FLARE_MAINNET,
        name: 'Flare Mainnet',
      },
      [NETWORK_CHAIN_ID.SONGBIRD_TESTNET]: {
        chainId: NETWORK_CHAIN_ID.SONGBIRD_TESTNET,
        name: 'Songbird Testnet',
      },
    };

    const result = enableAllNetworksFilter(
      mockNetworks as KnownNetworkConfigurations,
    );

    expect(result).toEqual({
      [NETWORK_CHAIN_ID.FLARE_MAINNET]: true,
      [NETWORK_CHAIN_ID.SONGBIRD_TESTNET]: true,
    });
  });

  it('should handle networks with different property values', () => {
    const mockNetworks = {
      [NETWORK_CHAIN_ID.ETHEREUM_MAINNET]: {
        chainId: NETWORK_CHAIN_ID.ETHEREUM_MAINNET,
        name: 'Network 1',
      },
      [NETWORK_CHAIN_ID.POLYGON]: {
        chainId: NETWORK_CHAIN_ID.POLYGON,
        name: 'Network 2',
      },
      [NETWORK_CHAIN_ID.BASE]: {
        chainId: NETWORK_CHAIN_ID.BASE,
        name: 'Network 3',
      },
    };

    const result = enableAllNetworksFilter(
      mockNetworks as KnownNetworkConfigurations,
    );

    expect(Object.values(result).every((value) => value === true)).toBe(true);
    expect(Object.keys(result)).toEqual([
      NETWORK_CHAIN_ID.ETHEREUM_MAINNET,
      NETWORK_CHAIN_ID.POLYGON,
      NETWORK_CHAIN_ID.BASE,
    ]);
  });
});
