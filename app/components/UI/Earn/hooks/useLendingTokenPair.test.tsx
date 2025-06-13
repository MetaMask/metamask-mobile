import useLendingTokenPair from './useLendingTokenPair';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  MOCK_DAI_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
} from '../../Stake/__mocks__/stakeMockData';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { createMockToken } from '../../Stake/testUtils';
import { TokenI } from '../../Tokens/types';

jest.mock('./useEarnTokenDetails', () => ({
  useEarnTokenDetails: () => ({
    getTokenWithBalanceAndApr: (token: TokenI) => ({
      ...token,
    }),
  }),
}));

const mockUsdcMainnet = {
  ...MOCK_USDC_MAINNET_ASSET,
  apr: '4.5',
  estimatedAnnualRewardsFormatted: '$5',
  balanceFiat: '$100',
  balanceFormatted: '100 USDC',
  balanceMinimalUnit: '100',
  balanceFiatNumber: 100,
  experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
};

const mockAEthUsdcMainnet = {
  ...createMockToken({
    chainId: '0x1',
    symbol: 'AETHUSDC',
    name: 'Aave v3 USDC',
  }),
  apr: '4.5',
  balanceFiat: '$100',
  balanceFormatted: '100 AETHUSDC',
  balanceMinimalUnit: '100',
  balanceFiatNumber: 100,
  experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
};

const mockDaiMainnet = {
  ...MOCK_DAI_MAINNET_ASSET,
  apr: '4.5',
  balanceFiat: '$100',
  balanceFormatted: '100 DAI',
  balanceMinimalUnit: '100',
  balanceFiatNumber: 100,
  experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
};

const mockADaiMainnet = {
  ...createMockToken({ chainId: '0x1', symbol: 'ADAI', name: 'Aave v3 DAI' }),
  apr: '4.5',
  balanceFiat: '$100',
  balanceFormatted: '100 ADAI',
  balanceMinimalUnit: '100',
  balanceFiatNumber: 100,
  experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
};

const mockUsdcBase = {
  ...createMockToken({
    chainId: '0x2105',
    symbol: 'USDC',
    name: 'Aave v3 USDC',
  }),
  apr: '4.5',
  balanceFiat: '$100',
  balanceFormatted: '100 DAI',
  balanceMinimalUnit: '100',
  balanceFiatNumber: 100,
  experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
};

const mockABasUsdcBase = {
  ...createMockToken({
    chainId: '0x2105',
    symbol: 'aBasUSDC',
    name: 'Aave v3 DAI',
  }),
  apr: '4.5',
  balanceFiat: '$100',
  balanceFormatted: '100 aBasUSDC',
  balanceMinimalUnit: '100',
  balanceFiatNumber: 100,
  experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
};

const mockEarnTokens = [
  mockUsdcMainnet,
  mockAEthUsdcMainnet,
  mockDaiMainnet,
  mockADaiMainnet,
  mockUsdcBase,
  mockABasUsdcBase,
];

jest.mock('./useEarnTokens', () => ({
  __esModule: true,
  default: () => mockEarnTokens,
}));

describe('useLendingTokenPair', () => {
  describe('Ethereum Mainnet', () => {
    it('returns pair when supported lending token is provided', () => {
      const { result } = renderHookWithProvider(() =>
        useLendingTokenPair(mockUsdcMainnet),
      );

      const { lendingToken, receiptToken } = result.current;

      expect(lendingToken.chainId).toBe(mockUsdcMainnet.chainId);
      expect(receiptToken.chainId).toBe(mockAEthUsdcMainnet.chainId);

      // Token pair must be on same network
      expect(lendingToken.chainId).toEqual(mockAEthUsdcMainnet.chainId);

      expect(lendingToken.symbol).toBe(mockUsdcMainnet.symbol);
      expect(receiptToken.symbol).toBe(mockAEthUsdcMainnet.symbol);
    });

    it('returns pair when supported receipt token is provided', () => {
      const { result } = renderHookWithProvider(() =>
        useLendingTokenPair(mockAEthUsdcMainnet),
      );

      const { lendingToken, receiptToken } = result.current;

      expect(lendingToken.chainId).toBe(mockUsdcMainnet.chainId);
      expect(receiptToken.chainId).toBe(mockAEthUsdcMainnet.chainId);

      // Token pair must be on same network
      expect(lendingToken.chainId).toEqual(mockAEthUsdcMainnet.chainId);

      expect(lendingToken.symbol).toBe(mockUsdcMainnet.symbol);
      expect(receiptToken.symbol).toBe(mockAEthUsdcMainnet.symbol);
    });

    it('returns empty result when token is undefined', () => {
      const { result } = renderHookWithProvider(() =>
        useLendingTokenPair({} as TokenI),
      );

      const { lendingToken, receiptToken } = result.current;

      expect(lendingToken).toStrictEqual({});
      expect(receiptToken).toStrictEqual({});
    });

    it('returns empty result when unsupported stablecoin is provided', () => {
      const fakeToken = { ...mockUsdcMainnet, symbol: 'fakeToken' };

      const { result } = renderHookWithProvider(() =>
        useLendingTokenPair(fakeToken as TokenI),
      );

      const { lendingToken, receiptToken } = result.current;

      expect(lendingToken).toStrictEqual({});
      expect(receiptToken).toStrictEqual({});
    });
  });
  describe('Base (L2)', () => {
    it('returns pair when supported lending token is provided', () => {
      const { result } = renderHookWithProvider(() =>
        useLendingTokenPair(mockUsdcBase),
      );

      const { lendingToken, receiptToken } = result.current;

      expect(lendingToken.chainId).toBe(mockUsdcBase.chainId);
      expect(receiptToken.chainId).toBe(mockABasUsdcBase.chainId);

      // Token pair must be on same network
      expect(lendingToken.chainId).toEqual(mockABasUsdcBase.chainId);

      expect(lendingToken.symbol).toBe(mockUsdcBase.symbol);
      expect(receiptToken.symbol).toBe(mockABasUsdcBase.symbol);
    });

    it('returns pair when supported receipt token is provided', () => {
      const { result } = renderHookWithProvider(() =>
        useLendingTokenPair(mockABasUsdcBase),
      );

      const { lendingToken, receiptToken } = result.current;

      expect(lendingToken.chainId).toBe(mockUsdcBase.chainId);
      expect(receiptToken.chainId).toBe(mockABasUsdcBase.chainId);

      // Token pair must be on same network
      expect(lendingToken.chainId).toEqual(mockABasUsdcBase.chainId);

      expect(lendingToken.symbol).toBe(mockUsdcBase.symbol);
      expect(receiptToken.symbol).toBe(mockABasUsdcBase.symbol);
    });
  });
});
