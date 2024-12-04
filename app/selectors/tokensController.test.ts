import { Token, TokensControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import {
  selectTokens,
  selectTokensByAddress,
  selectTokensLength,
  selectIgnoreTokens,
  selectDetectedTokens,
  selectAllTokensFlat,
  selectAllDetectedTokensForSelectedAddress,
  selectAllDetectedTokensFlat,
} from './tokensController';

describe('TokensController Selectors', () => {
  const mockToken = { address: '0xToken1', symbol: 'TOKEN1' };
  const mockToken2 = { address: '0xToken2', symbol: 'TOKEN2' };

  const mockTokensControllerState = {
    tokens: [mockToken],
    ignoredTokens: ['0xToken2'],
    detectedTokens: [mockToken],
    allTokens: {
      '0xAddress1': {
        '1': [mockToken],
      },
    },
    allDetectedTokens: {
      '1': {
        '0xAddress1': [mockToken],
      },
      '2': {
        '0xAddress2': [mockToken2],
      },
    },
  };

  const mockRootState: RootState = {
    engine: {
      backgroundState: {
        TokensController: mockTokensControllerState,
      },
    },
  } as unknown as RootState;

  describe('selectTokens', () => {
    it('returns tokens from TokensController state', () => {
      expect(selectTokens(mockRootState)).toStrictEqual([mockToken]);
    });

    it('returns an empty array if no tokens are present', () => {
      const stateWithoutTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              tokens: [],
            },
          },
        },
      } as unknown as RootState;

      expect(selectTokens(stateWithoutTokens)).toStrictEqual([]);
    });
  });

  describe('selectTokensByAddress', () => {
    it('returns tokens mapped by address', () => {
      expect(selectTokensByAddress(mockRootState)).toStrictEqual({
        '0xToken1': mockToken,
      });
    });

    it('handles an empty tokens array', () => {
      const stateWithoutTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              tokens: [],
            },
          },
        },
      } as unknown as RootState;

      expect(selectTokensByAddress(stateWithoutTokens)).toStrictEqual({});
    });
  });

  describe('selectTokensLength', () => {
    it('returns the number of tokens', () => {
      expect(selectTokensLength(mockRootState)).toBe(1);
    });

    it('returns 0 if no tokens are present', () => {
      const stateWithoutTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              tokens: [],
            },
          },
        },
      } as unknown as RootState;

      expect(selectTokensLength(stateWithoutTokens)).toBe(0);
    });
  });

  describe('selectIgnoreTokens', () => {
    it('returns ignored tokens', () => {
      expect(selectIgnoreTokens(mockRootState)).toStrictEqual(['0xToken2']);
    });

    it('returns undefined if ignored tokens are not set', () => {
      const stateWithoutIgnoredTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              ignoredTokens: undefined,
            },
          },
        },
      } as unknown as RootState;

      expect(selectIgnoreTokens(stateWithoutIgnoredTokens)).toBeUndefined();
    });
  });

  describe('selectDetectedTokens', () => {
    it('returns detected tokens', () => {
      expect(selectDetectedTokens(mockRootState)).toStrictEqual([mockToken]);
    });

    it('returns undefined if no detected tokens are present', () => {
      const stateWithoutDetectedTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              detectedTokens: undefined,
            },
          },
        },
      } as unknown as RootState;

      expect(selectDetectedTokens(stateWithoutDetectedTokens)).toBeUndefined();
    });
  });

  describe('selectAllTokensFlat', () => {
    it('returns all tokens as a flat array', () => {
      expect(selectAllTokensFlat(mockRootState)).toStrictEqual([mockToken]);
    });

    it('returns an empty array if no tokens are present', () => {
      const stateWithoutAllTokens = {
        ...mockRootState,
        engine: {
          backgroundState: {
            TokensController: {
              ...mockTokensControllerState,
              allTokens: {},
            },
          },
        },
      } as unknown as RootState;

      expect(selectAllTokensFlat(stateWithoutAllTokens)).toStrictEqual([]);
    });
  });

  describe('selectAllDetectedTokensForSelectedAddress', () => {
    it('returns detected tokens for the selected address', () => {
      const detectedTokens =
        selectAllDetectedTokensForSelectedAddress.resultFunc(
          mockTokensControllerState as unknown as TokensControllerState,
          '0xAddress1',
        );
      expect(detectedTokens).toStrictEqual({
        '1': [{ ...mockToken, chainId: '1' }],
      });
    });

    it('returns an empty object if no selected address is provided', () => {
      const detectedTokens =
        selectAllDetectedTokensForSelectedAddress.resultFunc(
          mockTokensControllerState as unknown as TokensControllerState,
          undefined,
        );
      expect(detectedTokens).toStrictEqual({});
    });
  });

  describe('selectAllDetectedTokensFlat', () => {
    it('returns all detected tokens as a flat array', () => {
      const detectedTokens = selectAllDetectedTokensFlat.resultFunc({
        '0x1': [mockToken as Token],
        '0x2': [mockToken2 as Token],
      });
      expect(detectedTokens).toStrictEqual([
        { ...mockToken, chainId: '0x1' },
        { ...mockToken2, chainId: '0x2' },
      ]);
    });

    it('returns an empty array if no detected tokens are present', () => {
      const detectedTokens = selectAllDetectedTokensFlat.resultFunc({});
      expect(detectedTokens).toStrictEqual([]);
    });
  });
});
