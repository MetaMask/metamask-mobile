import { act } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { RootState } from '../../../../reducers';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import useMultichainInputHandlers from './useMultichainInputHandlers';
import { EarnTokenDetails } from '../types/lending.types';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { Keys } from '../../../Base/Keypad/constants';

const mockSelectMultichainAssetsRates = jest.fn(() => ({}));
jest.mock('../../../../selectors/multichain', () => ({
  selectMultichainAssetsRates: () => mockSelectMultichainAssetsRates(),
}));

const mockIsNonEvmChainId = jest.fn((_chainId: string) => false);
jest.mock('../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: (chainId: string) => mockIsNonEvmChainId(chainId),
}));

describe('useMultichainInputHandlers', () => {
  const TRON_CHAIN_ID = 'tron:0x2b6653dc';
  const TRON_ADDRESS = 'tron:0x2b6653dc/slip44:195';
  const TRX_USD_RATE = 0.28;

  const mockEvmToken: EarnTokenDetails = {
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
    aggregators: ['uniswap'],
    image: 'https://example.com/eth-logo.png',
    balance: '1',
    chainId: CHAIN_IDS.MAINNET,
    experience: {
      type: EARN_EXPERIENCES.POOLED_STAKING,
      apr: '5%',
      estimatedAnnualRewardsFormatted: '0.05 ETH',
      estimatedAnnualRewardsFiatNumber: 100,
      estimatedAnnualRewardsTokenMinimalUnit: '50000000000000000',
      estimatedAnnualRewardsTokenFormatted: '0.05 ETH',
    },
    experiences: [],
    tokenUsdExchangeRate: 2000,
  };

  const mockTronToken: EarnTokenDetails = {
    balanceMinimalUnit: '56000000',
    decimals: 6,
    ticker: 'TRX',
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
    experiences: [],
    tokenUsdExchangeRate: TRX_USD_RATE,
  };

  const mockInitialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
      },
    },
  };

  const createMockEvmHandlers = (overrides = {}) => ({
    isFiat: false,
    currencyToggleValue: '0 USD',
    handleKeypadChange: jest.fn(),
    handleCurrencySwitch: jest.fn(),
    handleQuickAmountPress: jest.fn(),
    handleTokenInput: jest.fn(),
    handleFiatInput: jest.fn(),
    amountToken: '0',
    amountFiatNumber: '0',
    currentCurrency: 'USD',
    ...overrides,
  });

  const renderHook = (
    earnToken: EarnTokenDetails,
    evmHandlers = createMockEvmHandlers(),
    state: DeepPartial<RootState> = mockInitialState,
  ) =>
    renderHookWithProvider(
      () =>
        useMultichainInputHandlers({
          earnToken,
          evmHandlers,
        }),
      { state },
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNonEvmChainId.mockImplementation(() => false);
    mockSelectMultichainAssetsRates.mockReturnValue({});
  });

  describe('EVM chain behavior', () => {
    it('returns isNonEvm as false for EVM chains', () => {
      const { result } = renderHook(mockEvmToken);

      expect(result.current.isNonEvm).toBe(false);
    });

    it('returns undefined nonEvmFiatRate for EVM chains', () => {
      const { result } = renderHook(mockEvmToken);

      expect(result.current.nonEvmFiatRate).toBeUndefined();
    });

    it('passes through EVM currency toggle value unchanged', () => {
      const evmHandlers = createMockEvmHandlers({
        currencyToggleValue: '$100.00',
      });

      const { result } = renderHook(mockEvmToken, evmHandlers);

      expect(result.current.currencyToggleValue).toBe('$100.00');
    });

    it('passes through EVM fiat amount unchanged', () => {
      const evmHandlers = createMockEvmHandlers({ amountFiatNumber: '500' });

      const { result } = renderHook(mockEvmToken, evmHandlers);

      expect(result.current.amountFiatNumber).toBe('500');
    });

    it('delegates handleKeypadChange to EVM handler for EVM chains', () => {
      const mockEvmKeypadChange = jest.fn();
      const evmHandlers = createMockEvmHandlers({
        handleKeypadChange: mockEvmKeypadChange,
      });

      const { result } = renderHook(mockEvmToken, evmHandlers);

      act(() => {
        result.current.handleKeypadChange({ value: '5', pressedKey: '5' });
      });

      expect(mockEvmKeypadChange).toHaveBeenCalledWith({
        value: '5',
        pressedKey: '5',
      });
    });

    it('delegates handleCurrencySwitch to EVM handler', () => {
      const mockEvmCurrencySwitch = jest.fn();
      const evmHandlers = createMockEvmHandlers({
        handleCurrencySwitch: mockEvmCurrencySwitch,
      });

      const { result } = renderHook(mockEvmToken, evmHandlers);

      act(() => {
        result.current.handleCurrencySwitch();
      });

      expect(mockEvmCurrencySwitch).toHaveBeenCalled();
    });
  });

  describe('non-EVM chain behavior', () => {
    beforeEach(() => {
      mockIsNonEvmChainId.mockImplementation(
        (chainId: string) => chainId === TRON_CHAIN_ID,
      );
      mockSelectMultichainAssetsRates.mockReturnValue({
        [TRON_ADDRESS]: { rate: TRX_USD_RATE.toString() },
      });
    });

    it('returns isNonEvm as true for non-EVM chains', () => {
      const { result } = renderHook(mockTronToken);

      expect(result.current.isNonEvm).toBe(true);
    });

    it('returns nonEvmFiatRate from multichain rates', () => {
      const { result } = renderHook(mockTronToken);

      expect(result.current.nonEvmFiatRate).toBe(TRX_USD_RATE);
    });

    it('calculates fiat amount using multichain rate for token input', () => {
      const evmHandlers = createMockEvmHandlers({
        amountToken: '10',
        amountFiatNumber: '0',
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      expect(result.current.amountFiatNumber).toBe('2.80');
    });

    it('displays fiat value in currency toggle when in token mode', () => {
      const evmHandlers = createMockEvmHandlers({
        amountToken: '10',
        isFiat: false,
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      expect(result.current.currencyToggleValue).toBe('$2.80');
    });

    it('displays token value in currency toggle when in fiat mode', () => {
      const evmHandlers = createMockEvmHandlers({
        amountToken: '10',
        isFiat: true,
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      expect(result.current.currencyToggleValue).toBe('10 TRX');
    });

    it('converts fiat input to token amount using multichain rate', () => {
      const mockTokenInput = jest.fn();
      const evmHandlers = createMockEvmHandlers({
        handleTokenInput: mockTokenInput,
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      act(() => {
        result.current.handleFiatInput('2.80');
      });

      expect(mockTokenInput).toHaveBeenCalledWith('10.00000');
    });

    it('preserves typed fiat value when entered directly', () => {
      const mockTokenInput = jest.fn();
      const evmHandlers = createMockEvmHandlers({
        handleTokenInput: mockTokenInput,
        amountToken: '10.00000',
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');
    });

    it('clears typed fiat value when handleCurrencySwitch called', () => {
      const mockCurrencySwitch = jest.fn();
      const mockTokenInput = jest.fn();
      const evmHandlers = createMockEvmHandlers({
        handleCurrencySwitch: mockCurrencySwitch,
        handleTokenInput: mockTokenInput,
        amountToken: '19.82143',
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');

      act(() => {
        result.current.handleCurrencySwitch();
      });

      expect(mockCurrencySwitch).toHaveBeenCalled();
      expect(result.current.amountFiatNumber).toBe('5.55');
    });

    it('clears typed fiat value when handleTokenInput called', () => {
      const mockTokenInput = jest.fn();
      const evmHandlers = createMockEvmHandlers({
        handleTokenInput: mockTokenInput,
        amountToken: '10',
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');

      act(() => {
        result.current.handleTokenInput('20');
      });

      expect(mockTokenInput).toHaveBeenCalledWith('20');
    });

    it('clears typed fiat value when handleQuickAmountPress called', () => {
      const mockQuickAmountPress = jest.fn();
      const evmHandlers = createMockEvmHandlers({
        handleQuickAmountPress: mockQuickAmountPress,
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      act(() => {
        result.current.handleQuickAmountPress({ value: 0.5 });
      });

      expect(mockQuickAmountPress).toHaveBeenCalledWith({ value: 0.5 });
    });

    it('clears typed fiat value via clearNonEvmTypedFiatValue', () => {
      const mockTokenInput = jest.fn();
      const evmHandlers = createMockEvmHandlers({
        handleTokenInput: mockTokenInput,
        amountToken: '19.82143',
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');

      act(() => {
        result.current.clearNonEvmTypedFiatValue();
      });

      expect(result.current.amountFiatNumber).toBe('5.55');
    });

    describe('handleKeypadChange for non-EVM', () => {
      it('calls token input handler when in token mode', () => {
        const mockTokenInput = jest.fn();
        const evmHandlers = createMockEvmHandlers({
          handleTokenInput: mockTokenInput,
          isFiat: false,
          amountToken: '0',
        });

        const { result } = renderHook(mockTronToken, evmHandlers);

        act(() => {
          result.current.handleKeypadChange({ value: '5', pressedKey: '5' });
        });

        expect(mockTokenInput).toHaveBeenCalledWith('5');
      });

      it('calls fiat input handler when in fiat mode', () => {
        const mockTokenInput = jest.fn();
        const evmHandlers = createMockEvmHandlers({
          handleTokenInput: mockTokenInput,
          isFiat: true,
          amountToken: '0',
        });

        const { result } = renderHook(mockTronToken, evmHandlers);

        act(() => {
          result.current.handleKeypadChange({ value: '5', pressedKey: '5' });
        });

        expect(mockTokenInput).toHaveBeenCalledWith('17.85714');
      });

      it('handles backspace key correctly', () => {
        const mockTokenInput = jest.fn();
        const evmHandlers = createMockEvmHandlers({
          handleTokenInput: mockTokenInput,
          isFiat: false,
          amountToken: '10',
        });

        const { result } = renderHook(mockTronToken, evmHandlers);

        act(() => {
          result.current.handleKeypadChange({
            value: '1',
            pressedKey: Keys.Back,
          });
        });

        expect(mockTokenInput).toHaveBeenCalledWith('1');
      });

      it('handles period key for decimal input', () => {
        const mockTokenInput = jest.fn();
        const evmHandlers = createMockEvmHandlers({
          handleTokenInput: mockTokenInput,
          isFiat: false,
          amountToken: '0',
        });

        const { result } = renderHook(mockTronToken, evmHandlers);

        act(() => {
          result.current.handleKeypadChange({
            value: 'NaN',
            pressedKey: Keys.Period,
          });
        });

        expect(mockTokenInput).toHaveBeenCalledWith('0.');
      });

      it('handles initial digit input when value is NaN', () => {
        const mockTokenInput = jest.fn();
        const evmHandlers = createMockEvmHandlers({
          handleTokenInput: mockTokenInput,
          isFiat: false,
          amountToken: '0',
        });

        const { result } = renderHook(mockTronToken, evmHandlers);

        act(() => {
          result.current.handleKeypadChange({ value: 'NaN', pressedKey: '5' });
        });

        expect(mockTokenInput).toHaveBeenCalledWith('5');
      });

      it('rejects input exceeding max digits', () => {
        const mockTokenInput = jest.fn();
        const evmHandlers = createMockEvmHandlers({
          handleTokenInput: mockTokenInput,
          isFiat: false,
          amountToken: '123456789012',
        });

        const { result } = renderHook(mockTronToken, evmHandlers);

        act(() => {
          result.current.handleKeypadChange({
            value: '1234567890123',
            pressedKey: '3',
          });
        });

        expect(mockTokenInput).not.toHaveBeenCalled();
      });

      it('rejects input exceeding max fraction digits', () => {
        const mockTokenInput = jest.fn();
        const evmHandlers = createMockEvmHandlers({
          handleTokenInput: mockTokenInput,
          isFiat: false,
          amountToken: '1.12345',
        });

        const { result } = renderHook(mockTronToken, evmHandlers);

        act(() => {
          result.current.handleKeypadChange({
            value: '1.123456',
            pressedKey: '6',
          });
        });

        expect(mockTokenInput).not.toHaveBeenCalled();
      });
    });
  });

  describe('fallback behavior', () => {
    beforeEach(() => {
      mockIsNonEvmChainId.mockImplementation(() => true);
    });

    it('falls back to EVM fiat amount when multichain rate unavailable', () => {
      mockSelectMultichainAssetsRates.mockReturnValue({});
      const evmHandlers = createMockEvmHandlers({
        amountToken: '10',
        amountFiatNumber: '100',
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      expect(result.current.amountFiatNumber).toBe('100');
    });

    it('falls back to EVM currency toggle when multichain rate unavailable', () => {
      mockSelectMultichainAssetsRates.mockReturnValue({});
      const evmHandlers = createMockEvmHandlers({
        currencyToggleValue: '$100.00',
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      expect(result.current.currencyToggleValue).toBe('$100.00');
    });

    it('falls back to EVM fiat input handler when rate is zero', () => {
      mockSelectMultichainAssetsRates.mockReturnValue({
        [TRON_ADDRESS]: { rate: '0' },
      });
      const mockFiatInput = jest.fn();
      const evmHandlers = createMockEvmHandlers({
        handleFiatInput: mockFiatInput,
      });

      const { result } = renderHook(mockTronToken, evmHandlers);

      act(() => {
        result.current.handleFiatInput('5.00');
      });

      expect(mockFiatInput).toHaveBeenCalledWith('5.00');
    });
  });

  describe('earnToken changes', () => {
    beforeEach(() => {
      mockIsNonEvmChainId.mockImplementation(
        (chainId: string) => chainId === TRON_CHAIN_ID,
      );
      mockSelectMultichainAssetsRates.mockReturnValue({
        [TRON_ADDRESS]: { rate: TRX_USD_RATE.toString() },
      });
    });

    it('resets typed fiat value when earnToken chainId changes', () => {
      const mockTokenInput = jest.fn();
      let currentToken = mockTronToken;
      const evmHandlers = createMockEvmHandlers({
        handleTokenInput: mockTokenInput,
        amountToken: '19.82143',
      });

      const { result, rerender } = renderHookWithProvider(
        () =>
          useMultichainInputHandlers({
            earnToken: currentToken,
            evmHandlers,
          }),
        { state: mockInitialState },
      );

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');

      currentToken = {
        ...mockTronToken,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      };

      rerender(() =>
        useMultichainInputHandlers({
          earnToken: currentToken,
          evmHandlers,
        }),
      );

      expect(result.current.amountFiatNumber).not.toBe('5.55');
    });

    it('resets typed fiat value when earnToken ticker changes', () => {
      const mockTokenInput = jest.fn();
      let currentToken = mockTronToken;
      const evmHandlers = createMockEvmHandlers({
        handleTokenInput: mockTokenInput,
        amountToken: '10',
      });

      const { result, rerender } = renderHookWithProvider(
        () =>
          useMultichainInputHandlers({
            earnToken: currentToken,
            evmHandlers,
          }),
        { state: mockInitialState },
      );

      act(() => {
        result.current.handleFiatInput('5.55');
      });

      expect(result.current.amountFiatNumber).toBe('5.55');

      currentToken = {
        ...mockTronToken,
        ticker: 'sTRX',
      };

      rerender(() =>
        useMultichainInputHandlers({
          earnToken: currentToken,
          evmHandlers,
        }),
      );

      expect(result.current.amountFiatNumber).toBe('2.80');
    });
  });
});
