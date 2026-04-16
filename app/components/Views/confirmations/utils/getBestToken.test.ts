import { Hex } from 'viem';
import { AssetType } from '../types/token';
import { PreferredToken } from '../../../../selectors/featureFlagController/confirmations';
import {
  getBestToken,
  GetBestTokenParams,
  SetPayTokenRequest,
} from './getBestToken';

const TOKEN_ADDRESS_1 = '0x1234567890abcdef1234567890abcdef12345678';
const TOKEN_ADDRESS_2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const TOKEN_ADDRESS_3 = '0xabc1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_1 = '0x1';
const CHAIN_ID_2 = '0x2';
const CHAIN_ID_3 = '0x3';

function createToken(
  overrides: Partial<AssetType> & { address: string; chainId: string },
): AssetType {
  return {
    decimals: 18,
    image: '',
    name: 'Token',
    symbol: 'TKN',
    balance: '100',
    logo: undefined,
    isETH: false,
    ...overrides,
  } as AssetType;
}

function createPreferredToken(
  overrides: Partial<PreferredToken> & {
    address: string;
    chainId: string;
    successRate: number;
  },
): PreferredToken {
  return { ...overrides };
}

function createSetPayTokenRequest(
  address: string,
  chainId: string,
): SetPayTokenRequest {
  return { address: address as Hex, chainId: chainId as Hex };
}

const DEFAULT_PARAMS: GetBestTokenParams = {
  isHardwareWallet: false,
  isWithdraw: false,
  lastWithdrawToken: undefined,
  preferredToken: undefined,
  preferredTokensFromFlags: [],
  minimumRequiredTokenBalance: 0,
  targetToken: undefined,
  tokens: [],
};

function callGetBestToken(
  overrides: Partial<GetBestTokenParams> = {},
): ReturnType<typeof getBestToken> {
  return getBestToken({ ...DEFAULT_PARAMS, ...overrides });
}

describe('getBestToken', () => {
  describe('hardware wallet priority', () => {
    it('returns targetToken when hardware wallet with targetToken', () => {
      const targetToken = {
        address: TOKEN_ADDRESS_1 as Hex,
        chainId: CHAIN_ID_1 as Hex,
      };
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
      ];

      const result = callGetBestToken({
        isHardwareWallet: true,
        targetToken,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });

    it('returns undefined when hardware wallet without targetToken', () => {
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
      ];

      const result = callGetBestToken({
        isHardwareWallet: true,
        targetToken: undefined,
        tokens,
      });

      expect(result).toBeUndefined();
    });

    it('ignores available tokens and preferredToken for hardware wallet', () => {
      const targetToken = {
        address: TOKEN_ADDRESS_1 as Hex,
        chainId: CHAIN_ID_1 as Hex,
      };
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
        createToken({ address: TOKEN_ADDRESS_3, chainId: CHAIN_ID_1 }),
      ];

      const result = callGetBestToken({
        isHardwareWallet: true,
        targetToken,
        tokens,
        preferredToken: createSetPayTokenRequest(TOKEN_ADDRESS_2, CHAIN_ID_2),
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });
  });

  describe('withdraw + lastWithdrawToken priority', () => {
    it('returns lastWithdrawToken when withdraw and token is available', () => {
      const lastWithdrawToken = createSetPayTokenRequest(
        TOKEN_ADDRESS_2,
        CHAIN_ID_2,
      );
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_1, chainId: CHAIN_ID_1 }),
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
      ];

      const result = callGetBestToken({
        isWithdraw: true,
        lastWithdrawToken,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_2,
        chainId: CHAIN_ID_2,
      });
    });

    it('falls through when withdraw but lastWithdrawToken not in available tokens', () => {
      const lastWithdrawToken = createSetPayTokenRequest(
        TOKEN_ADDRESS_3,
        CHAIN_ID_3,
      );
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_1, chainId: CHAIN_ID_1 }),
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
      ];
      const preferredTokensFromFlags = [
        createPreferredToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          successRate: 0.9,
        }),
      ];

      const result = callGetBestToken({
        isWithdraw: true,
        lastWithdrawToken,
        tokens,
        preferredTokensFromFlags,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });

    it('matches lastWithdrawToken case-insensitively', () => {
      const lastWithdrawToken = createSetPayTokenRequest(
        TOKEN_ADDRESS_2.toUpperCase(),
        CHAIN_ID_2.toUpperCase(),
      );
      const tokens = [
        createToken({
          address: TOKEN_ADDRESS_2.toLowerCase(),
          chainId: CHAIN_ID_2.toLowerCase(),
        }),
      ];

      const result = callGetBestToken({
        isWithdraw: true,
        lastWithdrawToken,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_2.toUpperCase(),
        chainId: CHAIN_ID_2.toUpperCase(),
      });
    });

    it('skips lastWithdrawToken check when not withdraw', () => {
      const lastWithdrawToken = createSetPayTokenRequest(
        TOKEN_ADDRESS_2,
        CHAIN_ID_2,
      );
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_1, chainId: CHAIN_ID_1 }),
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
      ];

      const result = callGetBestToken({
        isWithdraw: false,
        lastWithdrawToken,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });
  });

  describe('explicit preferredToken priority', () => {
    it('returns preferredToken when available in tokens', () => {
      const preferredToken = createSetPayTokenRequest(
        TOKEN_ADDRESS_2,
        CHAIN_ID_2,
      );
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_1, chainId: CHAIN_ID_1 }),
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
        createToken({ address: TOKEN_ADDRESS_3, chainId: CHAIN_ID_1 }),
      ];

      const result = callGetBestToken({ preferredToken, tokens });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_2,
        chainId: CHAIN_ID_2,
      });
    });

    it('falls through to first token when preferredToken not in available tokens', () => {
      const preferredToken = createSetPayTokenRequest(
        TOKEN_ADDRESS_3,
        CHAIN_ID_3,
      );
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_1, chainId: CHAIN_ID_1 }),
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
      ];

      const result = callGetBestToken({ preferredToken, tokens });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });

    it('matches preferredToken case-insensitively', () => {
      const preferredToken = createSetPayTokenRequest(
        TOKEN_ADDRESS_1.toUpperCase(),
        CHAIN_ID_1.toUpperCase(),
      );
      const tokens = [
        createToken({
          address: TOKEN_ADDRESS_1.toLowerCase(),
          chainId: CHAIN_ID_1.toLowerCase(),
        }),
      ];

      const result = callGetBestToken({ preferredToken, tokens });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1.toUpperCase(),
        chainId: CHAIN_ID_1.toUpperCase(),
      });
    });
  });

  describe('feature-flag preferredTokens priority', () => {
    it('picks highest successRate token that is available', () => {
      const preferredTokensFromFlags = [
        createPreferredToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          successRate: 0.7,
        }),
        createPreferredToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          successRate: 0.95,
        }),
      ];
      const tokens = [
        createToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          fiat: { balance: 10 },
        }),
        createToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          fiat: { balance: 20 },
        }),
      ];

      const result = callGetBestToken({
        preferredTokensFromFlags,
        minimumRequiredTokenBalance: 5,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });

    it('skips preferred flag token when fiat balance is below minimum', () => {
      const preferredTokensFromFlags = [
        createPreferredToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          successRate: 0.95,
        }),
        createPreferredToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          successRate: 0.7,
        }),
      ];
      const tokens = [
        createToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          fiat: { balance: 10 },
        }),
        createToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          fiat: { balance: 20 },
        }),
      ];

      const result = callGetBestToken({
        preferredTokensFromFlags,
        minimumRequiredTokenBalance: 15,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_2,
        chainId: CHAIN_ID_2,
      });
    });

    it('ignores minimumRequiredTokenBalance for withdraw transactions', () => {
      const preferredTokensFromFlags = [
        createPreferredToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          successRate: 0.95,
        }),
      ];
      const tokens = [
        createToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          fiat: { balance: 1 },
        }),
        createToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          fiat: { balance: 100 },
        }),
      ];

      const result = callGetBestToken({
        isWithdraw: true,
        preferredTokensFromFlags,
        minimumRequiredTokenBalance: 50,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });

    it('treats missing fiat balance as 0 for minimum balance check', () => {
      const preferredTokensFromFlags = [
        createPreferredToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          successRate: 0.95,
        }),
        createPreferredToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          successRate: 0.7,
        }),
      ];
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_1, chainId: CHAIN_ID_1 }),
        createToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          fiat: { balance: 10 },
        }),
      ];

      const result = callGetBestToken({
        preferredTokensFromFlags,
        minimumRequiredTokenBalance: 5,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_2,
        chainId: CHAIN_ID_2,
      });
    });

    it('falls back to first token when no flag tokens meet minimum balance', () => {
      const preferredTokensFromFlags = [
        createPreferredToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          successRate: 0.95,
        }),
      ];
      const tokens = [
        createToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          fiat: { balance: 5 },
        }),
        createToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          fiat: { balance: 50 },
        }),
      ];

      const result = callGetBestToken({
        preferredTokensFromFlags,
        minimumRequiredTokenBalance: 100,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });

    it('skips flag tokens not present in available tokens', () => {
      const preferredTokensFromFlags = [
        createPreferredToken({
          address: TOKEN_ADDRESS_3,
          chainId: CHAIN_ID_3,
          successRate: 0.99,
        }),
        createPreferredToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          successRate: 0.5,
        }),
      ];
      const tokens = [
        createToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          fiat: { balance: 10 },
        }),
      ];

      const result = callGetBestToken({
        preferredTokensFromFlags,
        minimumRequiredTokenBalance: 5,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });
  });

  describe('fallback behavior', () => {
    it('returns first available token for non-withdraw', () => {
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
        createToken({ address: TOKEN_ADDRESS_3, chainId: CHAIN_ID_1 }),
        createToken({ address: TOKEN_ADDRESS_1, chainId: CHAIN_ID_1 }),
      ];

      const result = callGetBestToken({ tokens });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_2,
        chainId: CHAIN_ID_2,
      });
    });

    it('returns undefined for withdraw when no preferred tokens match', () => {
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_1, chainId: CHAIN_ID_1 }),
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
      ];

      const result = callGetBestToken({ isWithdraw: true, tokens });

      expect(result).toBeUndefined();
    });
  });

  describe('no tokens available', () => {
    it('returns targetToken when no tokens available', () => {
      const targetToken = {
        address: TOKEN_ADDRESS_1 as Hex,
        chainId: CHAIN_ID_1 as Hex,
      };

      const result = callGetBestToken({ tokens: [], targetToken });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });

    it('returns undefined when no tokens and no targetToken', () => {
      const result = callGetBestToken({
        tokens: [],
        targetToken: undefined,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('priority chain ordering', () => {
    it('prefers lastWithdrawToken over preferredToken for withdraw', () => {
      const lastWithdrawToken = createSetPayTokenRequest(
        TOKEN_ADDRESS_1,
        CHAIN_ID_1,
      );
      const preferredToken = createSetPayTokenRequest(
        TOKEN_ADDRESS_2,
        CHAIN_ID_2,
      );
      const tokens = [
        createToken({ address: TOKEN_ADDRESS_1, chainId: CHAIN_ID_1 }),
        createToken({ address: TOKEN_ADDRESS_2, chainId: CHAIN_ID_2 }),
      ];

      const result = callGetBestToken({
        isWithdraw: true,
        lastWithdrawToken,
        preferredToken,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_1,
        chainId: CHAIN_ID_1,
      });
    });

    it('prefers explicit preferredToken over feature-flag tokens', () => {
      const preferredToken = createSetPayTokenRequest(
        TOKEN_ADDRESS_2,
        CHAIN_ID_2,
      );
      const preferredTokensFromFlags = [
        createPreferredToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          successRate: 0.99,
        }),
      ];
      const tokens = [
        createToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          fiat: { balance: 100 },
        }),
        createToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          fiat: { balance: 100 },
        }),
      ];

      const result = callGetBestToken({
        preferredToken,
        preferredTokensFromFlags,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_2,
        chainId: CHAIN_ID_2,
      });
    });

    it('prefers feature-flag tokens over first-available fallback', () => {
      const preferredTokensFromFlags = [
        createPreferredToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          successRate: 0.8,
        }),
      ];
      const tokens = [
        createToken({
          address: TOKEN_ADDRESS_1,
          chainId: CHAIN_ID_1,
          fiat: { balance: 10 },
        }),
        createToken({
          address: TOKEN_ADDRESS_2,
          chainId: CHAIN_ID_2,
          fiat: { balance: 10 },
        }),
      ];

      const result = callGetBestToken({
        preferredTokensFromFlags,
        tokens,
      });

      expect(result).toStrictEqual({
        address: TOKEN_ADDRESS_2,
        chainId: CHAIN_ID_2,
      });
    });
  });
});
