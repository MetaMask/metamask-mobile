import { act } from '@testing-library/react-hooks';
import useEarnInputHandlers, { EarnInputProps } from './useEarnInput';
import useBalance from '../../Stake/hooks/useBalance';
import useStakingGasFee from '../../Stake/hooks/useStakingGasFee';
import useVaultMetadata from '../../Stake/hooks/useVaultMetadata';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../../reducers';
import BN4 from 'bnjs4';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '../../../../util/smart-transactions/smart-publish-hook';

jest.mock('../../Stake/hooks/useBalance');
jest.mock('../../Stake/hooks/useStakingGasFee');
jest.mock('../../Stake/hooks/useVaultMetadata');

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

describe('useEarnInputHandlers', () => {
  const mockEarnToken = {
    balanceMinimalUnit: '1000000000000000000', // 1 ETH
    decimals: 18,
    ticker: 'ETH',
    symbol: 'ETH',
    isETH: true,
    balanceFiat: '2000',
    balanceFormatted: '1 ETH',
    apr: '5%',
    balanceFiatNumber: 2000,
    estimatedAnnualRewardsFormatted: '0.05 ETH',
    address: '0x1234567890123456789012345678901234567890',
    name: 'Ethereum',
    network: 'mainnet',
    logo: 'https://example.com/eth-logo.png',
    contractAddress: '0x1234567890123456789012345678901234567890',
    aggregators: ['uniswap', 'sushiswap'],
    image: 'https://example.com/eth-logo.png',
    balance: '1',
  };

  const mockConversionRate = 2000; // 1 ETH = $2000
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
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    (useBalance as jest.Mock).mockReturnValue({
      balanceWei: new BN4('1000000000000000000'), // 1 ETH
      balanceETH: '1',
      balanceFiatNumber: '2000',
    });

    (useStakingGasFee as jest.Mock).mockReturnValue({
      estimatedGasFeeWei: new BN4('100000000000000000'), // 0.1 ETH
      isLoadingStakingGasFee: false,
      isStakingGasFeeError: false,
    });

    (useVaultMetadata as jest.Mock).mockReturnValue({
      annualRewardRate: '5%',
      annualRewardRateDecimal: 0.05,
      isLoadingVaultMetadata: false,
    });
  });

  it('should initialize with default values', () => {
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
    expect(result.current.isLoadingStakingGasFee).toBe(false);
    expect(result.current.isLoadingVaultMetadata).toBe(false);
    expect(result.current.balanceValue).toBe('1 ETH');
    expect(result.current.getDepositTxGasPercentage).toBeDefined();
    expect(result.current.isHighGasCostImpact).toBeDefined();
    expect(result.current.estimatedGasFeeWei).toEqual(
      new BN4('100000000000000000'),
    );
  });

  it('should handle token input correctly', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleTokenInput('0.5');
    });

    expect(result.current.amountToken).toBe('0.5');
    expect(result.current.amountFiatNumber).toBe('1000'); // 0.5 ETH = $1000
    expect(result.current.amountTokenMinimalUnit).toEqual(
      new BN4('500000000000000000'),
    );
  });

  it('should handle fiat input correctly', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleFiatInput('1000');
    });

    expect(result.current.amountFiatNumber).toBe('1000');
    expect(result.current.amountToken).toBe('0.5'); // $1000 = 0.5 ETH
    expect(result.current.amountTokenMinimalUnit).toEqual(
      new BN4('500000000000000000'),
    );
  });

  it('should switch between fiat and token display', () => {
    const { result } = renderHook();
    act(() => {
      result.current.handleCurrencySwitch();
    });

    expect(result.current.isFiat).toBe(true);
    expect(result.current.currencyToggleValue).toBe('0 ETH');
  });

  it('should calculate annual rewards correctly', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleTokenInput('1');
      result.current.calculateEstimatedAnnualRewards();
    });

    expect(result.current.annualRewardsToken).toBe('0.05 ETH');
  });

  it('should handle max input correctly', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleMax();
    });

    // Max amount should be balance minus gas fee (1 ETH - 0.1 ETH = 0.9 ETH)
    expect(result.current.amountToken).toBe('0.9');
  });

  it('should detect high gas cost impact', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleTokenInput('0.00001'); // Small amount, gas fee will be high percentage
    });

    expect(result.current.isHighGasCostImpact()).toBe(true);
  });

  it('should handle loading states correctly', () => {
    (useStakingGasFee as jest.Mock).mockReturnValue({
      estimatedGasFeeWei: new BN4('100000000000000000'),
      isLoadingStakingGasFee: true,
      isStakingGasFeeError: false,
    });

    const { result } = renderHook();

    expect(result.current.isLoadingStakingGasFee).toBe(true);
  });

  it('should handle erc20 token correctly', () => {
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
                    [mockUsdcAddress]: '0x5f5e100' as Hex, // 100 USDC
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
          balanceMinimalUnit: '1000000000', // 1000 USDC
          decimals: 6,
          ticker: 'USDC',
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

  it('should handle quick amount press below .00001 ETH correctly', () => {
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

  it('should handle max amount press below .00001 ETH correctly', () => {
    (useBalance as jest.Mock).mockReturnValue({
      balanceWei: new BN4('10'),
      balanceETH: '< .00001',
      balanceFiatNumber: '0',
    });
    (useStakingGasFee as jest.Mock).mockReturnValue({
      estimatedGasFeeWei: new BN4('0'),
      isLoadingStakingGasFee: false,
      isStakingGasFeeError: false,
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

    act(() => {
      result.current.handleMax();
    });

    expect(result.current.amountToken).toBe('< 0.00001');
    expect(result.current.amountFiatNumber).toBe('0');
    expect(result.current.amountTokenMinimalUnit).toEqual(new BN4('10'));
  });

  it('should flag isOverMaximum when amount is greater than balance - gas fee', () => {
    const { result } = renderHook();

    act(() => {
      result.current.handleTokenInput('1');
    });

    expect(result.current.isOverMaximum.isOverMaximumEth).toBe(true);
    expect(result.current.isOverMaximum.isOverMaximumToken).toBe(false);
  });

  it('should flag isOverMaximum when token amount is greater than balance', () => {
    const { result } = renderHook(undefined, {
      earnToken: {
        ...mockEarnToken,
        isETH: false,
        ticker: 'USDC',
        balanceMinimalUnit: '1000000000', // 1000 USDC
        balance: '1000',
        balanceFiat: '1000',
        balanceFormatted: '1000 USDC',
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
});
