import React from 'react';
import EarnBalance from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import StakingBalance from '../../../Stake/components/StakingBalance/StakingBalance';
import { TokenI } from '../../../Tokens/types';
import EarnLendingBalance from '../EarnLendingBalance';
import { selectTrxStakingEnabled } from '../../../../../selectors/featureFlagController/trxStakingEnabled';
import { selectTronResourcesBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import TronStakingButtons from '../Tron/TronStakingButtons';
import TronStakingCta from '../Tron/TronStakingButtons/TronStakingCta';

/**
 * We mock underlying components because we only care about the conditional rendering.
 * The underlying components have their own in-depth tests.
 */
jest.mock('../../../Stake/components/StakingBalance/StakingBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/trxStakingEnabled',
  () => ({
    selectTrxStakingEnabled: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/assets/assets-list', () => ({
  ...jest.requireActual('../../../../../selectors/assets/assets-list'),
  selectTronResourcesBySelectedAccountGroup: jest.fn(),
}));

jest.mock('../Tron/TronStakingButtons', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../Tron/TronStakingButtons/TronStakingCta', () => ({
  __esModule: true,
  default: jest.fn(() => null),
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
    (jest.mocked(selectTrxStakingEnabled) as jest.Mock).mockReturnValue(false);
    (
      jest.mocked(selectTronResourcesBySelectedAccountGroup) as jest.Mock
    ).mockReturnValue([]);
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

  describe('TRON', () => {
    const mockFlag = selectTrxStakingEnabled as unknown as jest.Mock;
    const mockTronResources =
      selectTronResourcesBySelectedAccountGroup as unknown as jest.Mock;

    it('renders TRON CTA and stake button for TRX without staked positions', () => {
      const trx: Partial<TokenI> = {
        chainId: 'tron:728126428',
        ticker: 'TRX',
        symbol: 'TRX',
      };

      mockFlag.mockReturnValue(true);
      mockTronResources.mockReturnValue([]);

      renderWithProvider(<EarnBalance asset={trx as TokenI} />);

      expect(TronStakingCta).toHaveBeenCalled();
      expect(TronStakingButtons).toHaveBeenCalled();
      const props = (TronStakingButtons as jest.Mock).mock.calls[0][0];
      expect(props.asset).toBe(trx);
      expect(props.showUnstake).toBeUndefined();
      expect(props.hasStakedPositions).toBeUndefined();
    });

    it('renders TRON stake more and unstake for sTRX with staked positions', () => {
      const strx: Partial<TokenI> = {
        chainId: 'tron:728126428',
        ticker: 'sTRX',
        symbol: 'sTRX',
        isStaked: true,
      };

      mockFlag.mockReturnValue(true);
      mockTronResources.mockReturnValue([
        { symbol: 'strx-energy', balance: '1' },
        { symbol: 'strx-bandwidth', balance: '2' },
      ]);

      renderWithProvider(<EarnBalance asset={strx as TokenI} />);

      expect(TronStakingCta).not.toHaveBeenCalled();
      expect(TronStakingButtons).toHaveBeenCalled();
      const props = (TronStakingButtons as jest.Mock).mock.calls[0][0];
      expect(props.asset).toBe(strx);
      expect(props.showUnstake).toBe(true);
      expect(props.hasStakedPositions).toBe(true);
    });
  });
});
