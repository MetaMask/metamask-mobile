import React from 'react';
import EarnBalance from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import StakingBalance from '../../../Stake/components/StakingBalance/StakingBalance';
import { TokenI } from '../../../Tokens/types';
import EarnLendingBalance from '../EarnLendingBalance';

/**
 * We mock underlying components because we only care about the conditional rendering.
 * The underlying components have their own in-depth tests.
 */
jest.mock('../../../Stake/components/StakingBalance/StakingBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../selectors/earnController', () => ({
  ...jest.requireActual('../../../../../selectors/earnController'),
  earnSelectors: {
    ...jest.requireActual('../../../../../selectors/earnController')
      .earnSelectors,
    selectEarnToken: jest.fn().mockImplementation((_state, token: TokenI) => {
      if (token.symbol === 'USDC' && token.chainId === '0x1') {
        return {
          ...token,
          experience: 'STABLECOIN_LENDING',
          balanceMinimalUnit: '100000000',
        };
      }
      if (token.symbol === 'USDC' && token.chainId === '0x2105') {
        return {
          ...token,
          experience: 'STABLECOIN_LENDING',
          balanceMinimalUnit: '100000000',
        };
      }
      return null;
    }),
    selectEarnOutputToken: jest
      .fn()
      .mockImplementation((_state, token: TokenI) => {
        if (token.symbol === 'AETHUSDC' && token.chainId === '0x1') {
          return {
            ...token,
            experience: 'STABLECOIN_LENDING',
            balanceMinimalUnit: '100000000',
          };
        }
        if (token.symbol === 'aBasUSDC' && token.chainId === '0x2105') {
          return {
            ...token,
            experience: 'STABLECOIN_LENDING',
            balanceMinimalUnit: '100000000',
          };
        }
        return null;
      }),
  },
}));

jest.mock('../EarnLendingBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('EarnBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Ethereum Mainnet', () => {
    it('renders staking balance when asset is ETH', () => {
      const mockEth = { isETH: true, isStaked: false };

      renderWithProvider(<EarnBalance asset={mockEth as unknown as TokenI} />);

      expect(StakingBalance).toHaveBeenCalled();
    });

    it('renders when asset is supported stablecoin', () => {
      const mockUsdc = { isETH: false, symbol: 'USDC', chainId: '0x1' };

      renderWithProvider(<EarnBalance asset={mockUsdc as unknown as TokenI} />);

      expect(EarnLendingBalance).toHaveBeenCalled();
    });

    it('renders when asset is supported receipt token', () => {
      const mockAethusdc = { isETH: false, symbol: 'AETHUSDC', chainId: '0x1' };

      renderWithProvider(
        <EarnBalance asset={mockAethusdc as unknown as TokenI} />,
      );

      expect(EarnLendingBalance).toHaveBeenCalled();
    });

    it('renders nothing if asset is not ETH or supported stablecoin', () => {
      const mockFakeToken = {
        isETH: false,
        symbol: 'fakeToken',
        chainId: '0x1',
      };

      renderWithProvider(
        <EarnBalance asset={mockFakeToken as unknown as TokenI} />,
      );
      expect(StakingBalance).not.toHaveBeenCalled();
      expect(EarnLendingBalance).not.toHaveBeenCalled();
    });

    it('renders nothinge if Staked ETH is passed', () => {
      const mockEth = { isETH: true, isStaked: true };

      renderWithProvider(<EarnBalance asset={mockEth as unknown as TokenI} />);

      expect(StakingBalance).not.toHaveBeenCalled();
      expect(EarnLendingBalance).not.toHaveBeenCalled();
    });
  });

  describe('Base (L2)', () => {
    it('renders when asset is supported stablecoin', () => {
      const mockBaseUsdc = { isETH: false, symbol: 'USDC', chainId: '0x2105' };

      renderWithProvider(
        <EarnBalance asset={mockBaseUsdc as unknown as TokenI} />,
      );

      expect(EarnLendingBalance).toHaveBeenCalled();
    });

    it('renders when asset is supported receipt token', () => {
      const mockaBasUsdc = {
        isETH: false,
        symbol: 'aBasUSDC',
        chainId: '0x2105',
      };

      renderWithProvider(
        <EarnBalance asset={mockaBasUsdc as unknown as TokenI} />,
      );

      expect(EarnLendingBalance).toHaveBeenCalled();
    });

    it('renders nothing if asset is not supported', () => {
      const mockFakeToken = {
        isETH: false,
        symbol: 'fakeToken',
        chainId: '0x2105',
      };

      renderWithProvider(
        <EarnBalance asset={mockFakeToken as unknown as TokenI} />,
      );

      expect(StakingBalance).not.toHaveBeenCalled();
      expect(EarnLendingBalance).not.toHaveBeenCalled();
    });
  });
});
