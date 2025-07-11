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
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

describe('useEarnWithdrawInputHandlers', () => {
  const mockEarnToken: EarnTokenDetails = {
    balanceMinimalUnit: '1000000000000000000', // 1 ETH
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

  const mockConversionRate = 2000; // 1 ETH = $2000
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
      stakedBalanceWei: '1000000000000000000', // 1 ETH
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
    });

    (useEarnDepositGasFee as jest.Mock).mockReturnValue({
      estimatedEarnGasFeeWei: new BN4('100000000000000000'), // 0.1 ETH
      isLoadingEarnGasFee: false,
      isEarnGasFeeError: false,
      getEstimatedEarnGasFee: jest
        .fn()
        .mockResolvedValue(new BN4('100000000000000000')),
    });
  });

  it('should initialize with default values', () => {
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

  it('should set earn balance value in fiat when isFiat is true', () => {
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
    });

    const { result } = renderHook();

    expect(result.current.isFiat).toBe(true);
    expect(result.current.earnBalanceValue).toBe('2000 USD');
  });

  it('should use stakedBalanceWei when token is ETH', () => {
    renderHook();

    // Verify useInputHandler was called with the correct balance
    expect(useInputHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        balance: '1000000000000000000',
        decimals: 18,
        ticker: 'ETH',
      }),
    );
  });

  it('should use "0" balance when token is not ETH', () => {
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

    // Verify useInputHandler was called with "0" balance
    expect(useInputHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        balance: '0',
      }),
    );
  });

  it('should handle loading gas fee state', () => {
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

  it('should handle gas fee error state', () => {
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
});
