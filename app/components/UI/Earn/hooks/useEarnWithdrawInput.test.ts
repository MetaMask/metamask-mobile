import BN4 from 'bnjs4';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { RootState } from '../../../../reducers';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import useEarnWithdrawInputHandlers from './useEarnWithdrawInput';
import useBalance from '../../Stake/hooks/useBalance';
import useInputHandler from './useInput';
import { EarnTokenDetails } from '../types/lending.types';
import { EARN_EXPERIENCES } from '../constants/experiences';
import useEarnDepositGasFee from './useEarnGasFee';

jest.mock('../../Stake/hooks/useBalance');
jest.mock('./useInput');
jest.mock('./useEarnGasFee');

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(() => ({})),
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

const mockSelectMultichainAssetsRates = jest.fn(() => ({}));
jest.mock('../../../../selectors/multichain', () => ({
  selectMultichainAssetsRates: () => mockSelectMultichainAssetsRates(),
}));

const mockIsNonEvmChainId = jest.fn((_chainId: string) => false);
jest.mock('../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: (chainId: string) => mockIsNonEvmChainId(chainId),
}));

describe('useEarnWithdrawInputHandlers', () => {
  const mockEarnToken: EarnTokenDetails = {
    balanceMinimalUnit: '1000000000000000000',
    decimals: 18,
    ticker: 'ETH',
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
    chainId: CHAIN_IDS.MAINNET,
    isNative: true,
    tokenUsdExchangeRate: 2000,
    experiences: [
      {
        type: EARN_EXPERIENCES.POOLED_STAKING,
        apr: '5%',
        estimatedAnnualRewardsFormatted: '0.05 ETH',
        estimatedAnnualRewardsFiatNumber: 100,
        estimatedAnnualRewardsTokenMinimalUnit: '50000000000000000',
        estimatedAnnualRewardsTokenFormatted: '0.05 ETH',
      },
    ],
    experience: {
      type: EARN_EXPERIENCES.POOLED_STAKING,
      apr: '5%',
      estimatedAnnualRewardsFormatted: '0.05 ETH',
      estimatedAnnualRewardsFiatNumber: 100,
      estimatedAnnualRewardsTokenMinimalUnit: '50000000000000000',
      estimatedAnnualRewardsTokenFormatted: '0.05 ETH',
    },
  };

  const mockConversionRate = 2000;
  const mockExchangeRate = 1;

  const mockInitialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {
            [CHAIN_IDS.MAINNET]: {
              chainId: CHAIN_IDS.MAINNET,
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

  const defaultProps = {
    earnToken: mockEarnToken,
    conversionRate: mockConversionRate,
    exchangeRate: mockExchangeRate,
  };

  const renderHook = (
    state: DeepPartial<RootState> = mockInitialState,
    props = defaultProps,
  ) =>
    renderHookWithProvider(() => useEarnWithdrawInputHandlers(props), {
      state,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    (useBalance as jest.Mock).mockReturnValue({
      stakedBalanceWei: '1000000000000000000',
      formattedStakedBalanceETH: '1 ETH',
      stakedBalanceFiatNumber: 2000,
    });

    (useInputHandler as jest.Mock).mockReturnValue({
      amountToken: '0',
      amountTokenMinimalUnit: new BN4(0),
      amountFiatNumber: '0',
      isFiat: false,
      currencyToggleValue: '0 USD',
      isNonZeroAmount: false,
      isOverMaximum: false,
      handleKeypadChange: jest.fn(),
      handleCurrencySwitch: jest.fn(),
      percentageOptions: [
        { value: 0.25, label: '25%' },
        { value: 0.5, label: '50%' },
        { value: 0.75, label: '75%' },
        { value: 1, label: '100%' },
      ],
      handleQuickAmountPress: jest.fn(),
      currentCurrency: 'USD',
      handleTokenInput: jest.fn(),
      handleFiatInput: jest.fn(),
    });

    (useEarnDepositGasFee as jest.Mock).mockReturnValue({
      estimatedEarnGasFeeWei: new BN4('100000000000000000'),
      isLoadingEarnGasFee: false,
      isEarnGasFeeError: false,
      getEstimatedEarnGasFee: jest
        .fn()
        .mockResolvedValue(new BN4('100000000000000000')),
    });
  });

  it('initializes with default values', () => {
    const { result } = renderHook();

    expect(result.current.isFiat).toBe(false);
    expect(result.current.currentCurrency).toBe('USD');
    expect(result.current.isNonZeroAmount).toBe(false);
    expect(result.current.amountToken).toBe('0');
    expect(result.current.amountTokenMinimalUnit).toEqual(new BN4(0));
    expect(result.current.amountFiatNumber).toBe('0');
    expect(result.current.isOverMaximum.isOverMaximumEth).toBe(false);
    expect(result.current.isOverMaximum.isOverMaximumToken).toBe(false);
    expect(result.current.handleCurrencySwitch).toBeDefined();
    expect(result.current.currencyToggleValue).toBe('0 USD');
    expect(result.current.percentageOptions).toBeDefined();
    expect(result.current.handleQuickAmountPress).toBeDefined();
    expect(result.current.handleKeypadChange).toBeDefined();
    expect(result.current.earnBalanceValue).toBe('1 ETH');
  });

  it('displays earn balance value in fiat when isFiat is true', () => {
    (useInputHandler as jest.Mock).mockReturnValue({
      amountToken: '0',
      amountTokenMinimalUnit: new BN4(0),
      amountFiatNumber: '0',
      isFiat: true,
      currencyToggleValue: '0 ETH',
      isNonZeroAmount: false,
      isOverMaximum: false,
      handleKeypadChange: jest.fn(),
      handleCurrencySwitch: jest.fn(),
      percentageOptions: [],
      handleQuickAmountPress: jest.fn(),
      currentCurrency: 'USD',
      handleTokenInput: jest.fn(),
      handleFiatInput: jest.fn(),
    });

    const { result } = renderHook();

    expect(result.current.isFiat).toBe(true);
    expect(result.current.earnBalanceValue).toBe('2000 USD');
  });

  it('uses stakedBalanceWei for balance when token is ETH', () => {
    renderHook();

    expect(useInputHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        balance: '1000000000000000000',
        decimals: 18,
        ticker: 'ETH',
      }),
    );
  });

  it('uses token balanceMinimalUnit when token is not ETH', () => {
    const props = {
      earnToken: {
        ...mockEarnToken,
        balanceMinimalUnit: '0',
        isETH: false,
        experiences: [
          {
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: '5%',
            estimatedAnnualRewardsFormatted: '0.05 USDC',
            estimatedAnnualRewardsFiatNumber: 100,
            estimatedAnnualRewardsTokenMinimalUnit: '50000000000000000',
            estimatedAnnualRewardsTokenFormatted: '0.05 USDC',
          },
        ],
        experience: {
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          apr: '5%',
          estimatedAnnualRewardsFormatted: '0.05 USDC',
          estimatedAnnualRewardsFiatNumber: 100,
          estimatedAnnualRewardsTokenMinimalUnit: '50000000000000000',
          estimatedAnnualRewardsTokenFormatted: '0.05 USDC',
        },
      },
      conversionRate: mockConversionRate,
      exchangeRate: mockExchangeRate,
    };

    renderHook(mockInitialState, props);

    expect(useInputHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        balance: '0',
      }),
    );
  });

  it('sets isOverMaximum to false during gas fee loading', () => {
    (useEarnDepositGasFee as jest.Mock).mockReturnValue({
      estimatedEarnGasFeeWei: new BN4('100000000000000000'),
      isLoadingEarnGasFee: true,
      isEarnGasFeeError: false,
      getEstimatedEarnGasFee: jest
        .fn()
        .mockResolvedValue(new BN4('100000000000000000')),
    });

    const { result } = renderHook();

    expect(result.current.isOverMaximum.isOverMaximumEth).toBe(false);
    expect(result.current.isOverMaximum.isOverMaximumToken).toBe(false);
  });

  it('sets isOverMaximum to false when gas fee has error', () => {
    (useEarnDepositGasFee as jest.Mock).mockReturnValue({
      estimatedEarnGasFeeWei: new BN4('100000000000000000'),
      isLoadingEarnGasFee: false,
      isEarnGasFeeError: true,
      getEstimatedEarnGasFee: jest
        .fn()
        .mockResolvedValue(new BN4('100000000000000000')),
    });

    const { result } = renderHook();

    expect(result.current.isOverMaximum.isOverMaximumEth).toBe(false);
    expect(result.current.isOverMaximum.isOverMaximumToken).toBe(false);
  });

  describe('non-EVM chain support', () => {
    const TRON_CHAIN_ID = 'tron:0x2b6653dc';
    const TRON_ADDRESS = 'tron:0x2b6653dc/slip44:195';
    const TRX_USD_RATE = 0.28;

    const mockTronToken: EarnTokenDetails = {
      balanceMinimalUnit: '56000000',
      decimals: 6,
      ticker: 'sTRX',
      symbol: 'sTRX',
      isETH: false,
      balanceFiat: '15.68',
      balanceFormatted: '56 sTRX',
      balanceFiatNumber: 15.68,
      address: TRON_ADDRESS,
      name: 'Staked Tron',
      logo: 'https://example.com/strx-logo.png',
      aggregators: [],
      image: 'https://example.com/strx-logo.png',
      balance: '56',
      chainId: TRON_CHAIN_ID,
      isNative: false,
      tokenUsdExchangeRate: TRX_USD_RATE,
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
      experience: {
        type: EARN_EXPERIENCES.POOLED_STAKING,
        apr: '5%',
        estimatedAnnualRewardsFormatted: '2.8 TRX',
        estimatedAnnualRewardsFiatNumber: 0.78,
        estimatedAnnualRewardsTokenMinimalUnit: '2800000',
        estimatedAnnualRewardsTokenFormatted: '2.8 TRX',
      },
    };

    const tronProps = {
      earnToken: mockTronToken,
      conversionRate: 0,
      exchangeRate: 0,
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

      (useInputHandler as jest.Mock).mockReturnValue({
        amountToken: '10',
        amountTokenMinimalUnit: new BN4('10000000'),
        amountFiatNumber: '0',
        isFiat: false,
        currencyToggleValue: '0 USD',
        isNonZeroAmount: true,
        isOverMaximum: false,
        handleKeypadChange: jest.fn(),
        handleCurrencySwitch: jest.fn(),
        percentageOptions: [
          { value: 0.25, label: '25%' },
          { value: 0.5, label: '50%' },
          { value: 0.75, label: '75%' },
          { value: 1, label: '100%' },
        ],
        handleQuickAmountPress: jest.fn(),
        currentCurrency: 'USD',
        handleTokenInput: jest.fn(),
        handleFiatInput: jest.fn(),
      });
    });

    it('calculates fiat amount using multichain rate for non-EVM token', () => {
      const { result } = renderHook(mockInitialState, tronProps);

      expect(result.current.amountFiatNumber).toBe('2.80');
    });

    it('displays correct currency toggle value for non-EVM token', () => {
      const { result } = renderHook(mockInitialState, tronProps);

      expect(result.current.currencyToggleValue).toBe('$2.80');
    });

    it('displays token amount in currency toggle when in fiat mode', () => {
      (useInputHandler as jest.Mock).mockReturnValue({
        amountToken: '10',
        amountTokenMinimalUnit: new BN4('10000000'),
        amountFiatNumber: '0',
        isFiat: true,
        currencyToggleValue: '10 sTRX',
        isNonZeroAmount: true,
        isOverMaximum: false,
        handleKeypadChange: jest.fn(),
        handleCurrencySwitch: jest.fn(),
        percentageOptions: [],
        handleQuickAmountPress: jest.fn(),
        currentCurrency: 'USD',
        handleTokenInput: jest.fn(),
        handleFiatInput: jest.fn(),
      });

      const { result } = renderHook(mockInitialState, tronProps);

      expect(result.current.currencyToggleValue).toBe('10 sTRX');
    });

    it('calculates balance fiat value using multichain rate', () => {
      (useInputHandler as jest.Mock).mockReturnValue({
        amountToken: '0',
        amountTokenMinimalUnit: new BN4(0),
        amountFiatNumber: '0',
        isFiat: true,
        currencyToggleValue: '0 sTRX',
        isNonZeroAmount: false,
        isOverMaximum: false,
        handleKeypadChange: jest.fn(),
        handleCurrencySwitch: jest.fn(),
        percentageOptions: [],
        handleQuickAmountPress: jest.fn(),
        currentCurrency: 'USD',
        handleTokenInput: jest.fn(),
        handleFiatInput: jest.fn(),
      });

      const { result } = renderHook(mockInitialState, tronProps);

      expect(result.current.earnBalanceValue).toBe('15.68 USD');
    });

    it('displays token balance when not in fiat mode', () => {
      const { result } = renderHook(mockInitialState, tronProps);

      expect(result.current.earnBalanceValue).toBe('56 sTRX');
    });

    it('falls back to EVM calculation when multichain rate is unavailable', () => {
      mockSelectMultichainAssetsRates.mockReturnValue({});

      mockIsNonEvmChainId.mockReturnValue(true);

      const { result } = renderHook(mockInitialState, tronProps);

      expect(result.current.amountFiatNumber).toBe('0');
    });

    it('exposes handleCurrencySwitch wrapper function', () => {
      const mockHandleCurrencySwitch = jest.fn();
      (useInputHandler as jest.Mock).mockReturnValue({
        amountToken: '10',
        amountTokenMinimalUnit: new BN4('10000000'),
        amountFiatNumber: '0',
        isFiat: false,
        currencyToggleValue: '0 USD',
        isNonZeroAmount: true,
        isOverMaximum: false,
        handleKeypadChange: jest.fn(),
        handleCurrencySwitch: mockHandleCurrencySwitch,
        percentageOptions: [],
        handleQuickAmountPress: jest.fn(),
        currentCurrency: 'USD',
        handleTokenInput: jest.fn(),
        handleFiatInput: jest.fn(),
      });

      const { result } = renderHook(mockInitialState, tronProps);

      result.current.handleCurrencySwitch();

      expect(mockHandleCurrencySwitch).toHaveBeenCalled();
    });

    it('exposes handleQuickAmountPress wrapper function', () => {
      const mockHandleQuickAmountPress = jest.fn();
      (useInputHandler as jest.Mock).mockReturnValue({
        amountToken: '10',
        amountTokenMinimalUnit: new BN4('10000000'),
        amountFiatNumber: '0',
        isFiat: false,
        currencyToggleValue: '0 USD',
        isNonZeroAmount: true,
        isOverMaximum: false,
        handleKeypadChange: jest.fn(),
        handleCurrencySwitch: jest.fn(),
        percentageOptions: [],
        handleQuickAmountPress: mockHandleQuickAmountPress,
        currentCurrency: 'USD',
        handleTokenInput: jest.fn(),
        handleFiatInput: jest.fn(),
      });

      const { result } = renderHook(mockInitialState, tronProps);

      result.current.handleQuickAmountPress({ value: 0.5 });

      expect(mockHandleQuickAmountPress).toHaveBeenCalledWith({ value: 0.5 });
    });

    it('exposes handleKeypadChange function for non-EVM chains', () => {
      const { result } = renderHook(mockInitialState, tronProps);

      expect(result.current.handleKeypadChange).toBeDefined();
    });

    it('recalculates fiat amount when earnToken chainId changes', () => {
      (useInputHandler as jest.Mock).mockReturnValue({
        amountToken: '10',
        amountTokenMinimalUnit: new BN4('10000000'),
        amountFiatNumber: '0',
        isFiat: false,
        currencyToggleValue: '0 USD',
        isNonZeroAmount: true,
        isOverMaximum: false,
        handleKeypadChange: jest.fn(),
        handleCurrencySwitch: jest.fn(),
        percentageOptions: [],
        handleQuickAmountPress: jest.fn(),
        currentCurrency: 'USD',
        handleTokenInput: jest.fn(),
        handleFiatInput: jest.fn(),
      });

      let currentProps = tronProps;

      const { result, rerender } = renderHookWithProvider(
        () => useEarnWithdrawInputHandlers(currentProps),
        { state: mockInitialState },
      );

      expect(result.current.amountFiatNumber).toBe('2.80');

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

      rerender(() => useEarnWithdrawInputHandlers(currentProps));

      expect(result.current.amountFiatNumber).toBe('0');
    });

    it('maintains fiat calculation when only earnToken ticker changes', () => {
      (useInputHandler as jest.Mock).mockReturnValue({
        amountToken: '10',
        amountTokenMinimalUnit: new BN4('10000000'),
        amountFiatNumber: '0',
        isFiat: false,
        currencyToggleValue: '0 USD',
        isNonZeroAmount: true,
        isOverMaximum: false,
        handleKeypadChange: jest.fn(),
        handleCurrencySwitch: jest.fn(),
        percentageOptions: [],
        handleQuickAmountPress: jest.fn(),
        currentCurrency: 'USD',
        handleTokenInput: jest.fn(),
        handleFiatInput: jest.fn(),
      });

      let currentProps = tronProps;

      const { result, rerender } = renderHookWithProvider(
        () => useEarnWithdrawInputHandlers(currentProps),
        { state: mockInitialState },
      );

      expect(result.current.amountFiatNumber).toBe('2.80');

      currentProps = {
        earnToken: {
          ...mockTronToken,
          ticker: 'newTRX',
        },
        conversionRate: 0,
        exchangeRate: 0,
      };

      rerender(() => useEarnWithdrawInputHandlers(currentProps));

      expect(result.current.amountFiatNumber).toBe('2.80');
    });
  });
});
