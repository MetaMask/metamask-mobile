import {
  getAssetIdCaipChainId,
  getAssetIdNamespaceAndReference,
} from './activityAssetId';

describe('activityAssetId', () => {
  describe('getAssetIdCaipChainId', () => {
    it('returns the chain id portion of an asset id', () => {
      expect(getAssetIdCaipChainId('eip155:1/erc20:0xabc')).toBe('eip155:1');
      expect(
        getAssetIdCaipChainId(
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        ),
      ).toBe('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
    });

    it('returns undefined when there is no asset id', () => {
      expect(getAssetIdCaipChainId(undefined)).toBeUndefined();
    });
  });

  describe('getAssetIdNamespaceAndReference', () => {
    it('splits an ERC-20 asset id into namespace and reference', () => {
      expect(
        getAssetIdNamespaceAndReference('eip155:1/erc20:0xabc'),
      ).toStrictEqual({ namespace: 'erc20', reference: '0xabc' });
    });

    it('splits a native asset id into namespace and coin type', () => {
      expect(
        getAssetIdNamespaceAndReference('eip155:1/slip44:60'),
      ).toStrictEqual({ namespace: 'slip44', reference: '60' });
    });

    it('returns empty fields when there is no asset portion', () => {
      expect(getAssetIdNamespaceAndReference('eip155:1')).toStrictEqual({
        namespace: undefined,
        reference: undefined,
      });
      expect(getAssetIdNamespaceAndReference(undefined)).toStrictEqual({
        namespace: undefined,
        reference: undefined,
      });
    });
  });
});
