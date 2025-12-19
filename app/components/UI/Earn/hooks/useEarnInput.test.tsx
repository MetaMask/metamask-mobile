import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { act } from '@testing-library/react-hooks';
import BN4 from 'bnjs4';
import { RootState } from '../../../../reducers';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import useEarnGasFee from '../../Earn/hooks/useEarnGasFee';
import useBalance from '../../Stake/hooks/useBalance';
import useVaultMetadata from '../../Stake/hooks/useVaultMetadata';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';
import useEarnInputHandlers, { EarnInputProps } from './useEarnInput';

jest.mock('../../Stake/hooks/useBalance');
jest.mock('../../Earn/hooks/useEarnGasFee');
jest.mock('../../Stake/hooks/useVaultMetadata');

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'USD'),
  selectCurrencyRates: jest.fn(() => ({
    ETH: {
      conversionRate: 2000,
    },
  })),
}));

const mockSelectMultichainAssetsRates = jest.fn(() => ({}));
jest.mock('../../../../selectors/multichain', () => ({
  selectNativeTokensAcrossChainsForAddress: jest.fn(() => [
    {
      address: '0x0',
    },
  ]),
  selectAccountTokensAcrossChains: jest.fn(() => [
    {
      address: '0x0',
    },
  ]),
  selectAccountTokensAcrossChainsUnified: jest.fn(() => ({})),
  selectMultichainAssetsRates: () => mockSelectMultichainAssetsRates(),
}));

const mockIsNonEvmChainId = jest.fn((_chainId: string) => false);
jest.mock('../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: (chainId: string) => mockIsNonEvmChainId(chainId),
}));

describe('useEarnInputHandlers', () => {
  const mockExperience = {
    type: EARN_EXPERIENCES.POOLED_STAKING,
    apr: '5%',
    estimatedAnnualRewardsFormatted: '0.05 ETH',
    estimatedAnnualRewardsFiatNumber: 0.05,
    estimatedAnnualRewardsTokenMinimalUnit: '0.05',
    estimatedAnnualRewardsTokenFormatted: '0.05 ETH',
  };
  const mockEarnToken: EarnTokenDetails = {
    balanceMinimalUnit: '1000000000000000000',
    decimals: 18,
    ticker: 'ETH',
    isStaked: false,
    symbol: 'ETH',
    isETH: true,
    balanceFiat: '2000',
    balanceFormatted: '1 ETH',
    balanceFiatNumber: 2000,
    address: '0x1234567890123456789012345678901234567890',
    name: 'Ethereum',
    logo: 'https://example.com/eth-logo.png',
    aggregators: ['uniswap', 'sushiswap'],
    image: 'https://example.com/eth-logo.png',
    balance: '1',
    experience: mockExperience,
    experiences: [mockExperience],
    tokenUsdExchangeRate: 1,
  };

  const mockConversionRate = 2000;
  const mockExchangeRate = 1;
  const mockAddress = '0x00000';
  const mockUsdcAddress = '0x00001';
  const mockInitialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        TokenBalancesController: {
          tokenBalances: {
            [mockAddress]: {
              [CHAIN_IDS.MAINNET]: {
                [mockUsdcAddress]: '0x0' as Hex,
              },
            },
          },
        },
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              chainId: CHAIN_IDS.MAINNET as Hex,
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                },
              ],
              defaultBlockExplorerUrlIndex: 0,
              blockExplorerUrls: ['https://etherscan.io'],
            },
          },
        },
      },
    },
  };

  const defaultProps: EarnInputProps = {
    earnToken: mockEarnToken,
    conversionRate: mockConversionRate,
    exchangeRate: mockExchangeRate,
  };

  const renderHook = (
    state: DeepPartial<RootState> = mockInitialState,
    props: EarnInputProps = defaultProps,
  ) => renderHookWithProvider(() => useEarnInputHandlers(props), { state });

  beforeEach(() => {
    jest.clearAllMocks();

    (useBalance as jest.Mock).mockReturnValue({
      balanceWei: new BN4('1000000000000000000'),
      balanceETH: '1',
      balanceFiatNumber: '2000',
    });

    (useEarnGasFee as jest.Mock).mockReturnValue({
      estimatedEarnGasFeeWei: new BN4('100000000000000000'),
      isLoadingEarnGasFee: false,
      isEarnGasFeeError: false,
    });

    (useVaultMetadata as jest.Mock).mockReturnValue({
      annualRewardRate: '5%',
      annualRewardRateDecimal: 0.05,
      isLoadingVaultMetadata: false,
    });
  });

  it('initializes with default values', () => {
    const { result } = renderHook();

    expect(result.current.amountTokenMinimalUnit).toEqual(new BN4(0));
    expect(result.current.amountFiatNumber).toBe('0');
    expect(result.current.isFiat).toBe(false);
    expect(result.current.currencyToggleValue).toBe('0 USD');
    expect(result.current.isNonZeroAmount).toBe(false);
    expect(result.current.isOverMaximum.isOverMaximumEth).toBe(false);
    expect(result.current.isOverMaximum.isOverMaximumToken).toBe(false);
    expect(result.current.amountToken).toBe('0');
    expect(result.current.handleTokenInput).toBeDefined();
    expect(result.current.handleFiatInput).toBeDefined();
    expect(result.current.handleKeypadChange).toBeDefined();
    expect(result.current.handleCurrencySwitch).toBeDefined();
    expect(result.current.percentageOptions).toBeDefined();
    expect(result.current.handleQuickAmountPress).toBeDefined();
    expect(result.current.currentCurrency).toBe('USD');
    expect(result.current.conversionRate).toBe(2000);
    expect(result.current.estimatedAnnualRewards).toBe('-');
    expect(result.current.calculateEstimatedAnnualRewards).toBeDefined();
    expect(result.current.annualRewardsToken).toBe('0 ETH');
    expect(result.current.annualRewardsFiat).toBe('0 USD');
    expect(result.current.annualRewardRate).toBe('5%');
    expect(result.current.handleMax).toBeDefined();
    expect(result.current.isLoadingEarnGasFee).toBe(false);
    expect(result.current.isLoadingEarnMetadata).toBe(false);
    expect(result.current.balanceValue).toBe('1 ETH');
    expect(result.current.getDepositTxGasPercentage).toBeDefined();
    expect(result.current.isHighGasCostImpact).toBeDefined();
    expect(result.current.estimatedGasFeeWei).toEqual(
      new BN4('100000000000000000'),
    );
  });

  it('handles token input and converts to fiat', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleTokenInput('0.5');
    });

    expect(result.current.amountToken).toBe('0.5');
    expect(result.current.amountFiatNumber).toBe('1000');
    expect(result.current.amountTokenMinimalUnit).toEqual(
      new BN4('500000000000000000'),
    );
  });

  it('handles fiat input and converts to token amount', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleFiatInput('1000');
    });

    expect(result.current.amountFiatNumber).toBe('1000');
    expect(result.current.amountToken).toBe('0.5');
    expect(result.current.amountTokenMinimalUnit).toEqual(
      new BN4('500000000000000000'),
    );
  });

  it('switches between fiat and token display mode', () => {
    const { result } = renderHook();
    act(() => {
      result.current.handleCurrencySwitch();
    });

    expect(result.current.isFiat).toBe(true);
    expect(result.current.currencyToggleValue).toBe('0 ETH');
  });

  it('calculates annual rewards based on input amount', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleTokenInput('1');
      result.current.calculateEstimatedAnnualRewards();
    });

    expect(result.current.annualRewardsToken).toBe('0.05 ETH');
  });

  it('sets max input accounting for gas fee', async () => {
    (useEarnGasFee as jest.Mock).mockReturnValue({
      getEstimatedEarnGasFee: jest
        .fn()
        .mockResolvedValue(new BN4('100000000000000000')),
      estimatedEarnGasFeeWei: new BN4('100000000000000000'),
      isLoadingEarnGasFee: false,
      isEarnGasFeeError: false,
    });

    (useBalance as jest.Mock).mockReturnValue({
      balanceWei: new BN4('1000000000000000000'),
      balanceETH: '1',
      balanceFiatNumber: '2000',
    });

    const { result } = renderHook();

    await act(async () => {
      await result.current.handleMax();
    });

    expect(result.current.amountToken).toBe('0.9');
  });

  it('detects high gas cost impact for small amounts', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleTokenInput('0.00001');
    });

    expect(result.current.isHighGasCostImpact()).toBe(true);
  });

  it('reflects loading state from gas fee hook', () => {
    (useEarnGasFee as jest.Mock).mockReturnValue({
      estimatedEarnGasFeeWei: new BN4('100000000000000000'),
      isLoadingEarnGasFee: true,
      isEarnGasFeeError: false,
    });

    const { result } = renderHook();

    expect(result.current.isLoadingEarnGasFee).toBe(true);
  });

  it('handles ERC20 token with correct decimals conversion', () => {
    const { result } = renderHook(
      {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokenBalancesController: {
              ...mockInitialState.engine.backgroundState
                .TokenBalancesController,
              tokenBalances: {
                [mockAddress]: {
                  [CHAIN_IDS.MAINNET]: {
                    [mockUsdcAddress]: '0x5f5e100' as Hex,
                  },
                },
              },
            },
          },
        },
      },
      {
        earnToken: {
          ...mockEarnToken,
          isETH: false,
          balanceMinimalUnit: '1000000000',
          decimals: 6,
          ticker: 'USDC',
          experience: {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '5%',
            estimatedAnnualRewardsFormatted: '10 USDC',
            estimatedAnnualRewardsFiatNumber: 10,
            estimatedAnnualRewardsTokenMinimalUnit: '10000000',
            estimatedAnnualRewardsTokenFormatted: '`10 USDC',
          },
        },
        conversionRate: 1,
        exchangeRate: 1,
      },
    );

    act(() => {
      result.current.handleTokenInput('1');
    });

    expect(result.current.amountToken).toBe('1');
    expect(result.current.amountFiatNumber).toBe('1');
    expect(result.current.amountTokenMinimalUnit).toEqual(new BN4('1000000'));
  });

  it('handles quick amount press for dust balance below .00001 ETH', () => {
    const { result } = renderHook(undefined, {
      earnToken: {
        ...mockEarnToken,
        balanceMinimalUnit: '10',
        balance: '< .00001',
        balanceFiat: '< .01',
        balanceFormatted: '< .00001 ETH',
      },
      conversionRate: 2000,
      exchangeRate: 1,
    });

    act(() => {
      result.current.handleQuickAmountPress({ value: 0.25 });
    });

    expect(result.current.amountToken).toBe('< 0.00001');
    expect(result.current.amountFiatNumber).toBe('0');
    expect(result.current.amountTokenMinimalUnit).toEqual(new BN4('2'));
  });

  it('handles max amount press for dust balance below .00001 ETH', async () => {
    (useBalance as jest.Mock).mockReturnValue({
      balanceWei: new BN4('10'),
      balanceETH: '< .00001',
      balanceFiatNumber: '0',
    });
    (useEarnGasFee as jest.Mock).mockReturnValue({
      getEstimatedEarnGasFee: jest.fn(() => Promise.resolve(new BN4('0'))),
      estimatedEarnGasFeeWei: new BN4('0'),
      isLoadingEarnGasFee: false,
      isEarnGasFeeError: false,
    });

    const { result } = renderHook(undefined, {
      earnToken: {
        ...mockEarnToken,
        balanceMinimalUnit: '10',
        balance: '< .00001',
        balanceFiat: '< .01',
        balanceFormatted: '< .00001 ETH',
      },
      conversionRate: 2000,
      exchangeRate: 1,
    });

    await act(async () => {
      await result.current.handleMax();
    });

    expect(result.current.amountToken).toBe('< 0.00001');
    expect(result.current.amountFiatNumber).toBe('0');
    expect(result.current.amountTokenMinimalUnit).toEqual(new BN4('10'));
  });

  it('flags isOverMaximumEth when ETH amount exceeds balance minus gas fee', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleTokenInput('1');
    });

    expect(result.current.isOverMaximum.isOverMaximumEth).toBe(true);
    expect(result.current.isOverMaximum.isOverMaximumToken).toBe(false);
  });

  it('flags isOverMaximumToken when token amount exceeds balance', () => {
    const { result } = renderHook(undefined, {
      earnToken: {
        ...mockEarnToken,
        isETH: false,
        ticker: 'USDC',
        balanceMinimalUnit: '1000000000',
        balance: '1000',
        balanceFiat: '1000',
        balanceFormatted: '1000 USDC',
        experience: {
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          apr: '5%',
          estimatedAnnualRewardsFormatted: '10 USDC',
          estimatedAnnualRewardsFiatNumber: 10,
          estimatedAnnualRewardsTokenMinimalUnit: '10000000',
          estimatedAnnualRewardsTokenFormatted: '`10 USDC',
        },
      },
      conversionRate: 1,
      exchangeRate: 1,
    });

    act(() => {
      result.current.handleTokenInput('10000');
    });

    expect(result.current.isOverMaximum.isOverMaximumEth).toBe(false);
    expect(result.current.isOverMaximum.isOverMaximumToken).toBe(true);
  });

  describe('non-EVM chain support', () => {
    const TRON_CHAIN_ID = 'tron:0x2b6653dc';
    const TRON_ADDRESS = 'tron:0x2b6653dc/slip44:195';
    const TRX_USD_RATE = 0.28;

    const mockTronToken: EarnTokenDetails = {
      balanceMinimalUnit: '56000000',
      decimals: 6,
      ticker: 'TRX',
      isStaked: false,
      symbol: 'TRX',
      isETH: false,
      balanceFiat: '15.68',
      balanceFormatted: '56 TRX',
      balanceFiatNumber: 15.68,
      address: TRON_ADDRESS,
      name: 'Tron',
      logo: 'https://example.com/trx-logo.png',
      aggregators: [],
      image: 'https://example.com/trx-logo.png',
      balance: '56',
      chainId: TRON_CHAIN_ID,
      experience: {
        type: EARN_EXPERIENCES.POOLED_STAKING,
        apr: '5%',
        estimatedAnnualRewardsFormatted: '2.8 TRX',
        estimatedAnnualRewardsFiatNumber: 0.78,
        estimatedAnnualRewardsTokenMinimalUnit: '2800000',
        estimatedAnnualRewardsTokenFormatted: '2.8 TRX',
      },
      experiences: [
        {
          type: EARN_EXPERIENCES.POOLED_STAKING,
          apr: '5%',
          estimatedAnnualRewardsFormatted: '2.8 TRX',
          estimatedAnnualRewardsFiatNumber: 0.78,
          estimatedAnnualRewardsTokenMinimalUnit: '2800000',
          estimatedAnnualRewardsTokenFormatted: '2.8 TRX',
        },
      ],
      tokenUsdExchangeRate: TRX_USD_RATE,
    };

    beforeEach(() => {
      mockIsNonEvmChainId.mockImplementation(
        (chainId: string) => chainId === TRON_CHAIN_ID,
      );

      mockSelectMultichainAssetsRates.mockReturnValue({
        [TRON_ADDRESS]: {
          rate: TRX_USD_RATE.toString(),
        },
      });
    });

    it('calculates fiat amount using multichain rate for non-EVM token input', () => {
      const { result } = renderHook(mockInitialState, {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      });

      act(() => {
        result.current.handleTokenInput('10');
      });

      expect(result.current.amountToken).toBe('10');
      expect(result.current.amountFiatNumber).toBe('2.80');
    });

    it('displays correct currency toggle value for non-EVM token', () => {
      const { result } = renderHook(mockInitialState, {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      });

      act(() => {
        result.current.handleTokenInput('10');
      });

      expect(result.current.currencyToggleValue).toBe('$2.80');
    });

    it('displays correct currency toggle value in fiat mode for non-EVM token', () => {
      const { result } = renderHook(mockInitialState, {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      });

      act(() => {
        result.current.handleTokenInput('10');
        result.current.handleCurrencySwitch();
      });

      expect(result.current.currencyToggleValue).toBe('10 TRX');
    });

    it('handles fiat input correctly for non-EVM chains', () => {
      const { result } = renderHook(mockInitialState, {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      });

      act(() => {
        result.current.handleFiatInput('2.80');
      });

      expect(result.current.amountFiatNumber).toBe('2.80');
      expect(result.current.amountToken).toBe('10.00000');
    });

    it('preserves typed fiat value for non-EVM chains', () => {
      const { result } = renderHook(mockInitialState, {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      });

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');
    });

    it('resets typed fiat value when switching currency modes', () => {
      const { result } = renderHook(mockInitialState, {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      });

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');

      act(() => {
        result.current.handleCurrencySwitch();
      });

      const expectedFiat = (
        (parseFloat('5.55') / TRX_USD_RATE) *
        TRX_USD_RATE
      ).toFixed(2);
      expect(result.current.amountFiatNumber).toBe(expectedFiat);
    });

    it('resets typed fiat value when using quick amount press', () => {
      const { result } = renderHook(mockInitialState, {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      });

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');

      act(() => {
        result.current.handleQuickAmountPress({ value: 0.5 });
      });

      expect(result.current.amountFiatNumber).toBe('7.84');
    });

    it('calculates balance value using multichain rate for non-EVM token', () => {
      const { result } = renderHook(mockInitialState, {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      });

      expect(result.current.balanceValue).toBe('56 TRX');

      act(() => {
        result.current.handleCurrencySwitch();
      });

      expect(result.current.balanceValue).toBe('15.68 USD');
    });

    it('falls back to EVM calculation when multichain rate is unavailable', () => {
      mockSelectMultichainAssetsRates.mockReturnValue({});

      mockIsNonEvmChainId.mockReturnValue(true);

      const { result } = renderHook(mockInitialState, {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      });

      act(() => {
        result.current.handleTokenInput('10');
      });

      expect(result.current.amountFiatNumber).toBe('0');
    });

    it('resets typed fiat value when earnToken chainId changes', () => {
      let currentProps: EarnInputProps = {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      };

      const { result, rerender } = renderHookWithProvider(
        () => useEarnInputHandlers(currentProps),
        { state: mockInitialState },
      );

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');

      currentProps = {
        earnToken: {
          ...mockTronToken,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          ticker: 'SOL',
          symbol: 'SOL',
        },
        conversionRate: 0,
        exchangeRate: 0,
      };

      rerender(() => useEarnInputHandlers(currentProps));

      expect(result.current.amountFiatNumber).not.toBe('5.55');
    });

    it('resets typed fiat value when earnToken ticker changes', () => {
      let currentProps: EarnInputProps = {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      };

      const { result, rerender } = renderHookWithProvider(
        () => useEarnInputHandlers(currentProps),
        { state: mockInitialState },
      );

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');

      currentProps = {
        earnToken: {
          ...mockTronToken,
          ticker: 'sTRX',
        },
        conversionRate: 0,
        exchangeRate: 0,
      };

      rerender(() => useEarnInputHandlers(currentProps));

      expect(result.current.amountFiatNumber).not.toBe('5.55');
    });

    it('clears typed fiat value when handleMax is pressed', async () => {
      const { result } = renderHook(mockInitialState, {
        earnToken: mockTronToken,
        conversionRate: 0,
        exchangeRate: 0,
      });

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');

      await act(async () => {
        await result.current.handleMax();
      });

      expect(result.current.amountFiatNumber).toBe('15.68');
    });
  });
});
