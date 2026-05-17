import {
  resolveRampControllerAssetId,
  TokenForResolve,
} from './resolveRampControllerAssetId';

function createTokens(overrides: TokenForResolve[] = []): TokenForResolve[] {
  return overrides;
}

describe('resolveRampControllerAssetId', () => {
  describe('when allTokens is empty or has no match', () => {
    it('returns the input assetId when allTokens is empty', () => {
      const assetId =
        'eip155:1/erc20:0x1234567890123456789012345678901234567890';

      const result = resolveRampControllerAssetId(assetId, []);

      expect(result).toBe(assetId);
    });

    it('returns the input assetId when allTokens has no matching token', () => {
      const assetId = 'eip155:1/erc20:0xabcdef';
      const allTokens = createTokens([
        { assetId: 'eip155:1/erc20:0x123456', chainId: '1' },
      ]);

      const result = resolveRampControllerAssetId(assetId, allTokens);

      expect(result).toBe(assetId);
    });
  });

  describe('ERC20 assetId resolution (case-insensitive)', () => {
    it('resolves to controller canonical format when input is lowercase and controller has checksummed', () => {
      const inputAssetId = 'eip155:1/erc20:0xabc123';
      const controllerAssetId = 'eip155:1/erc20:0xABC123';
      const allTokens = createTokens([
        { assetId: controllerAssetId, chainId: '1' },
      ]);

      const result = resolveRampControllerAssetId(inputAssetId, allTokens);

      expect(result).toBe(controllerAssetId);
    });

    it('resolves to controller canonical format when input is uppercase and controller has lowercase', () => {
      const inputAssetId = 'eip155:1/erc20:0xABCDEF';
      const controllerAssetId = 'eip155:1/erc20:0xabcdef';
      const allTokens = createTokens([
        { assetId: controllerAssetId, chainId: '1' },
      ]);

      const result = resolveRampControllerAssetId(inputAssetId, allTokens);

      expect(result).toBe(controllerAssetId);
    });
  });

  describe('native token (slip44) resolution', () => {
    it('resolves by chainId and slip44 presence to controller canonical assetId', () => {
      const inputAssetId = 'eip155:1/slip44:.';
      const controllerAssetId = 'eip155:1/slip44:60';
      const allTokens = createTokens([
        { assetId: controllerAssetId, chainId: 'eip155:1' },
        { assetId: 'eip155:137/slip44:60', chainId: 'eip155:137' },
      ]);

      const result = resolveRampControllerAssetId(inputAssetId, allTokens);

      expect(result).toBe(controllerAssetId);
    });

    it('returns input assetId when no token matches chainId for native asset', () => {
      const inputAssetId = 'eip155:1/slip44:.';
      const allTokens = createTokens([
        { assetId: 'eip155:137/slip44:60', chainId: 'eip155:137' },
      ]);

      const result = resolveRampControllerAssetId(inputAssetId, allTokens);

      expect(result).toBe(inputAssetId);
    });
  });

  describe('tokens without assetId', () => {
    it('skips tokens without assetId and matches next token', () => {
      const assetId = 'eip155:1/erc20:0x123';
      const allTokens = createTokens([
        { chainId: '1' },
        { assetId: 'eip155:1/erc20:0x123', chainId: '1' },
      ]);

      const result = resolveRampControllerAssetId(assetId, allTokens);

      expect(result).toBe('eip155:1/erc20:0x123');
    });
  });
});
