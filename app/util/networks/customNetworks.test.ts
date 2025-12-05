import {
  PopularList,
  getNonEvmNetworkImageSourceByChainId,
  getFilteredPopularNetworks,
} from './customNetworks';
import { toHex } from '@metamask/controller-utils';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import { CaipChainId } from '@metamask/utils';

describe('popularNetwork', () => {
  it('should have correct chainIds for all popular network', () => {
    const expectedChainIds: { [key: string]: string } = {
      Avalanche: toHex('43114'),
      Arbitrum: toHex('42161'),
      'BNB Chain': toHex('56'),
      Base: toHex('8453'),
      OP: toHex('10'),
      Palm: toHex('11297108109'),
      Polygon: toHex('137'),
      'zkSync Era': toHex('324'),
      Sei: toHex('1329'),
      Monad: toHex('143'),
      HyperEVM: toHex('999'),
      MegaEth: toHex('4326'),
    };

    PopularList.forEach((rpc) => {
      expect(rpc.chainId).toBe(expectedChainIds[rpc.nickname]);
    });
  });
});

describe('getNonEvmNetworkImageSourceByChainId', () => {
  describe('Solana networks', () => {
    it('should return solana mainnet image for SolScope.Mainnet', () => {
      const imageSource = getNonEvmNetworkImageSourceByChainId(
        SolScope.Mainnet,
      );
      expect(imageSource).toBeDefined();
    });

    it('should return solana devnet image for SolScope.Devnet', () => {
      const imageSource = getNonEvmNetworkImageSourceByChainId(SolScope.Devnet);
      expect(imageSource).toBeDefined();
    });
  });

  describe('Bitcoin networks', () => {
    it('should return bitcoin mainnet image for BtcScope.Mainnet', () => {
      const imageSource = getNonEvmNetworkImageSourceByChainId(
        BtcScope.Mainnet,
      );
      expect(imageSource).toBeDefined();
    });

    it('should return bitcoin testnet image for BtcScope.Testnet', () => {
      const imageSource = getNonEvmNetworkImageSourceByChainId(
        BtcScope.Testnet,
      );
      expect(imageSource).toBeDefined();
    });

    it('should return bitcoin testnet image for BtcScope.Testnet4', () => {
      const imageSource = getNonEvmNetworkImageSourceByChainId(
        BtcScope.Testnet4,
      );
      expect(imageSource).toBeDefined();
    });

    it('should return bitcoin testnet image for BtcScope.Regtest', () => {
      const imageSource = getNonEvmNetworkImageSourceByChainId(
        BtcScope.Regtest,
      );
      expect(imageSource).toBeDefined();
    });

    it('should return bitcoin signet image for BtcScope.Signet', () => {
      const imageSource = getNonEvmNetworkImageSourceByChainId(BtcScope.Signet);
      expect(imageSource).toBeDefined();
    });
  });

  it('should return undefined for invalid chainId', () => {
    const invalidChainId = 'invalid:chain:id' as CaipChainId;
    const imageSource = getNonEvmNetworkImageSourceByChainId(invalidChainId);
    expect(imageSource).toBeUndefined();
  });
});

describe('getFilteredPopularNetworks', () => {
  it('filters out blacklisted chain IDs from PopularList', () => {
    const blacklistedChainIds = [toHex('43114'), toHex('42161')];

    const result = getFilteredPopularNetworks(blacklistedChainIds);

    expect(result).not.toContainEqual(
      expect.objectContaining({ chainId: toHex('43114') }),
    );
    expect(result).not.toContainEqual(
      expect.objectContaining({ chainId: toHex('42161') }),
    );
    expect(result.length).toBeLessThan(PopularList.length);
  });

  it('returns full list when blacklist is empty array', () => {
    const blacklistedChainIds: string[] = [];

    const result = getFilteredPopularNetworks(blacklistedChainIds);

    expect(result).toEqual(PopularList);
    expect(result.length).toBe(PopularList.length);
  });

  it('filters single network from custom list', () => {
    const customList = [
      {
        chainId: toHex('43114'),
        nickname: 'Avalanche',
        rpcUrl: 'https://avalanche.infura.io/v3/test',
        ticker: 'AVAX',
        rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
      },
      {
        chainId: toHex('42161'),
        nickname: 'Arbitrum',
        rpcUrl: 'https://arbitrum.infura.io/v3/test',
        ticker: 'ETH',
        rpcPrefs: { blockExplorerUrl: 'https://arbiscan.io' },
      },
      {
        chainId: toHex('137'),
        nickname: 'Polygon',
        rpcUrl: 'https://polygon.infura.io/v3/test',
        ticker: 'POL',
        rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
      },
    ];
    const blacklistedChainIds = [toHex('42161')];

    const result = getFilteredPopularNetworks(blacklistedChainIds, customList);

    expect(result.length).toBe(2);
    expect(result).not.toContainEqual(
      expect.objectContaining({ chainId: toHex('42161') }),
    );
    expect(result).toContainEqual(
      expect.objectContaining({ chainId: toHex('43114') }),
    );
    expect(result).toContainEqual(
      expect.objectContaining({ chainId: toHex('137') }),
    );
  });

  it('returns empty array when all networks are blacklisted', () => {
    const allChainIds = PopularList.map((network) => network.chainId);

    const result = getFilteredPopularNetworks(allChainIds);

    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it('returns empty array when blacklisted chain IDs do not match any network', () => {
    const blacklistedChainIds = [toHex('999999'), toHex('888888')];

    const result = getFilteredPopularNetworks(blacklistedChainIds);

    expect(result).toEqual(PopularList);
    expect(result.length).toBe(PopularList.length);
  });
});
