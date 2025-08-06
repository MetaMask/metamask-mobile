import { renderHook, act } from '@testing-library/react-native';
import { usePerpsOrderForm } from './usePerpsOrderForm';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsAccount } from './usePerpsAccount';
import { TRADING_DEFAULTS } from '../constants/hyperLiquidConfig';

jest.mock('./usePerpsNetwork');
jest.mock('./usePerpsAccount');

describe('usePerpsOrderForm', () => {
  const mockUsePerpsNetwork = usePerpsNetwork as jest.MockedFunction<
    typeof usePerpsNetwork
  >;
  const mockUsePerpsAccount = usePerpsAccount as jest.MockedFunction<
    typeof usePerpsAccount
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockUsePerpsAccount.mockReturnValue({
      availableBalance: '1000',
      totalBalance: '1000',
      marginUsed: '0',
      unrealizedPnl: '0',
    });
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      expect(result.current.orderForm).toEqual({
        asset: 'BTC',
        direction: 'long',
        amount: TRADING_DEFAULTS.amount.mainnet.toString(),
        leverage: TRADING_DEFAULTS.leverage,
        balancePercent: expect.any(Number),
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
        limitPrice: undefined,
      });
    });

    it('should initialize with provided values', () => {
      const { result } = renderHook(() =>
        usePerpsOrderForm({
          initialAsset: 'ETH',
          initialDirection: 'short',
          initialAmount: '500',
          initialLeverage: 20,
        }),
      );

      expect(result.current.orderForm).toEqual({
        asset: 'ETH',
        direction: 'short',
        amount: '500',
        leverage: 20,
        balancePercent: expect.any(Number),
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
        limitPrice: undefined,
      });
    });

    it('should use testnet defaults when on testnet', () => {
      mockUsePerpsNetwork.mockReturnValue('testnet');

      const { result } = renderHook(() => usePerpsOrderForm());

      expect(result.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.testnet.toString(),
      );
    });
  });

  describe('form updates', () => {
    it('should update amount', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.setAmount('250');
      });

      expect(result.current.orderForm.amount).toBe('250');
    });

    it('should update leverage', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.setLeverage(15);
      });

      expect(result.current.orderForm.leverage).toBe(15);
    });

    it('should update direction', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.setDirection('short');
      });

      expect(result.current.orderForm.direction).toBe('short');
    });

    it('should update asset', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.setAsset('SOL');
      });

      expect(result.current.orderForm.asset).toBe('SOL');
    });

    it('should update take profit price', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.setTakeProfitPrice('55000');
      });

      expect(result.current.orderForm.takeProfitPrice).toBe('55000');
    });

    it('should update stop loss price', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.setStopLossPrice('45000');
      });

      expect(result.current.orderForm.stopLossPrice).toBe('45000');
    });

    it('should update limit price', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.setLimitPrice('50000');
      });

      expect(result.current.orderForm.limitPrice).toBe('50000');
    });

    it('should update multiple fields at once', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.updateOrderForm({
          amount: '300',
          leverage: 25,
          direction: 'short',
        });
      });

      expect(result.current.orderForm.amount).toBe('300');
      expect(result.current.orderForm.leverage).toBe(25);
      expect(result.current.orderForm.direction).toBe('short');
    });
  });

  describe('percentage handlers', () => {
    it('should handle percentage amount', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.handlePercentageAmount(0.5);
      });

      expect(result.current.orderForm.amount).toBe('500'); // 50% of 1000
    });

    it('should handle max amount', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.handleMaxAmount();
      });

      expect(result.current.orderForm.amount).toBe('1000');
    });

    it('should handle min amount for mainnet', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.handleMinAmount();
      });

      expect(result.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.mainnet.toString(),
      );
    });

    it('should handle min amount for testnet', () => {
      mockUsePerpsNetwork.mockReturnValue('testnet');
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.handleMinAmount();
      });

      expect(result.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.testnet.toString(),
      );
    });

    it('should not update amount when balance is 0', () => {
      mockUsePerpsAccount.mockReturnValue({
        availableBalance: '0',
        totalBalance: '0',
        marginUsed: '0',
        unrealizedPnl: '0',
      });

      const { result } = renderHook(() => usePerpsOrderForm());
      const initialAmount = result.current.orderForm.amount;

      act(() => {
        result.current.handlePercentageAmount(0.5);
      });

      expect(result.current.orderForm.amount).toBe(initialAmount);
    });
  });

  describe('calculations', () => {
    it('should calculate margin required', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.setAmount('1000');
        result.current.setLeverage(10);
      });

      expect(result.current.calculations.marginRequired).toBe('100.00');
    });

    it('should update margin required when leverage changes', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.setAmount('1000');
        result.current.setLeverage(20);
      });

      expect(result.current.calculations.marginRequired).toBe('50.00');
    });
  });

  describe('empty amount handling', () => {
    it('should convert empty string to 0', () => {
      const { result } = renderHook(() => usePerpsOrderForm());

      act(() => {
        result.current.setAmount('');
      });

      expect(result.current.orderForm.amount).toBe('0');
    });
  });
});
