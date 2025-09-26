import {
  PopularList,
  getNonEvmNetworkImageSourceByChainId,
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
