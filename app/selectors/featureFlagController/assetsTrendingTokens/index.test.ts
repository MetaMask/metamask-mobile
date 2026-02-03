import { selectAssetsTrendingTokensEnabled } from '.';

describe('Assets Trending Tokens Feature Flag Selector', () => {
  describe('selectAssetsTrendingTokensEnabled', () => {
    it('always returns true since the feature is released', () => {
      const result = selectAssetsTrendingTokensEnabled();

      expect(result).toBe(true);
    });
  });
});
