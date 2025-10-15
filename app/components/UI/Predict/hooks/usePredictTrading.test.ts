import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictTrading } from './usePredictTrading';
import { PredictPositionStatus, Side } from '../types';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPositions: jest.fn(),
      getClaimablePositions: jest.fn(),
      placeOrder: jest.fn(),
      claim: jest.fn(),
      calculateBetAmounts: jest.fn(),
      calculateCashOutAmounts: jest.fn(),
      getBalance: jest.fn(),
    },
  },
}));

describe('usePredictTrading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPositions', () => {
    it('calls PredictController.getPositions and returns positions', async () => {
      const mockPositions = [
        {
          id: 'pos1',
          market: 'BTC/UP',
          side: 'UP',
          size: '10',
          entryPrice: '100',
          payout: '180',
          status: 'OPEN',
        },
      ];

      (
        Engine.context.PredictController.getPositions as jest.Mock
      ).mockResolvedValue(mockPositions);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.getPositions({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });

      expect(
        Engine.context.PredictController.getPositions,
      ).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });
      expect(response).toEqual(mockPositions);
    });

    it('handles errors from PredictController.getPositions', async () => {
      const mockError = new Error('Failed to fetch predict positions');
      (
        Engine.context.PredictController.getPositions as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.getPositions({
          address: '0x1234567890123456789012345678901234567890',
          providerId: 'polymarket',
        }),
      ).rejects.toThrow('Failed to fetch predict positions');
    });
  });

  describe('placeOrder', () => {
    it('calls PredictController.placeOrder for buy and returns result', async () => {
      const mockBuyResult = {
        txMeta: { id: 'tx-123', hash: '0xabc123' },
        providerId: 'provider-789',
      };

      (
        Engine.context.PredictController.placeOrder as jest.Mock
      ).mockResolvedValue(mockBuyResult);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.placeOrder({
        outcomeId: 'outcome-789',
        outcomeTokenId: 'outcome-token-101',
        side: Side.BUY,
        size: 100,
        providerId: 'polymarket',
      });

      expect(Engine.context.PredictController.placeOrder).toHaveBeenCalledWith({
        outcomeId: 'outcome-789',
        outcomeTokenId: 'outcome-token-101',
        side: Side.BUY,
        size: 100,
        providerId: 'polymarket',
      });
      expect(response).toEqual(mockBuyResult);
    });

    it('calls PredictController.placeOrder for sell and returns result', async () => {
      const mockSellResult = {
        txMeta: { id: 'tx-456', hash: '0xdef456' },
        success: true,
      };

      (
        Engine.context.PredictController.placeOrder as jest.Mock
      ).mockResolvedValue(mockSellResult);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.placeOrder({
        outcomeId: 'outcome-101',
        outcomeTokenId: 'outcome-token-202',
        side: Side.SELL,
        size: 50,
        providerId: 'polymarket',
      });

      expect(Engine.context.PredictController.placeOrder).toHaveBeenCalledWith({
        outcomeId: 'outcome-101',
        outcomeTokenId: 'outcome-token-202',
        side: Side.SELL,
        size: 50,
        providerId: 'polymarket',
      });
      expect(response).toEqual(mockSellResult);
    });

    it('handles errors from PredictController.placeOrder', async () => {
      const mockError = new Error('Failed to place order');
      (
        Engine.context.PredictController.placeOrder as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.placeOrder({
          outcomeId: 'outcome-789',
          outcomeTokenId: 'outcome-token-101',
          side: Side.BUY,
          size: 100,
          providerId: 'polymarket',
        }),
      ).rejects.toThrow('Failed to place order');
    });
  });

  describe('claim', () => {
    const mockClaimablePositions = [
      {
        id: 'position-123',
        providerId: 'provider-456',
        marketId: 'market-789',
        outcomeId: 'outcome-101',
        outcome: 'UP',
        outcomeTokenId: 'outcome-token-202',
        title: 'BTC UP',
        icon: 'btc-icon.png',
        amount: 100,
        price: 1.0,
        status: PredictPositionStatus.REDEEMABLE,
        size: 100,
        outcomeIndex: 0,
        realizedPnl: 50,
        curPrice: 1.5,
        conditionId: 'condition-303',
        percentPnl: 50,
        cashPnl: 50,
        redeemable: true,
        initialValue: 100,
        avgPrice: 1.0,
        currentValue: 150,
        endDate: '2025-01-01',
        claimable: false,
      },
      {
        id: 'position-456',
        providerId: 'provider-789',
        marketId: 'market-101',
        outcomeId: 'outcome-202',
        outcome: 'DOWN',
        outcomeTokenId: 'outcome-token-303',
        title: 'ETH DOWN',
        icon: 'eth-icon.png',
        amount: 75,
        price: 1.2,
        status: PredictPositionStatus.REDEEMABLE,
        size: 75,
        outcomeIndex: 1,
        realizedPnl: 25,
        curPrice: 1.5,
        conditionId: 'condition-404',
        percentPnl: 33.33,
        cashPnl: 25,
        redeemable: true,
        initialValue: 75,
        avgPrice: 1.2,
        currentValue: 112.5,
        endDate: '2025-02-01',
        claimable: false,
      },
    ];

    it('calls PredictController.claim and returns result', async () => {
      const mockClaimResult = {
        txMeta: { id: 'tx-789', hash: '0xghi789' },
        success: true,
        claimedAmount: 175,
      };

      (Engine.context.PredictController.claim as jest.Mock).mockResolvedValue(
        mockClaimResult,
      );

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.claim({
        positions: mockClaimablePositions,
        providerId: 'polymarket',
      });

      expect(Engine.context.PredictController.claim).toHaveBeenCalledWith({
        positions: mockClaimablePositions,
        providerId: 'polymarket',
      });
      expect(response).toEqual(mockClaimResult);
    });

    it('handles errors from PredictController.claim', async () => {
      const mockError = new Error('Failed to claim winnings');
      (Engine.context.PredictController.claim as jest.Mock).mockRejectedValue(
        mockError,
      );

      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.claim({
          positions: mockClaimablePositions,
          providerId: 'polymarket',
        }),
      ).rejects.toThrow('Failed to claim winnings');
    });

    it('handles empty positions array', async () => {
      const mockClaimResult = {
        txMeta: { id: 'tx-empty', hash: '0xempty' },
        success: true,
        claimedAmount: 0,
      };

      (Engine.context.PredictController.claim as jest.Mock).mockResolvedValue(
        mockClaimResult,
      );

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.claim({
        positions: [],
        providerId: 'polymarket',
      });

      expect(Engine.context.PredictController.claim).toHaveBeenCalledWith({
        positions: [],
        providerId: 'polymarket',
      });
      expect(response).toEqual(mockClaimResult);
    });

    it('handles single position claim', async () => {
      const singlePosition = [mockClaimablePositions[0]];
      const mockClaimResult = {
        txMeta: { id: 'tx-single', hash: '0xsingle' },
        success: true,
        claimedAmount: 150,
      };

      (Engine.context.PredictController.claim as jest.Mock).mockResolvedValue(
        mockClaimResult,
      );

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.claim({
        positions: singlePosition,
        providerId: 'polymarket',
      });

      expect(Engine.context.PredictController.claim).toHaveBeenCalledWith({
        positions: singlePosition,
        providerId: 'polymarket',
      });
      expect(response).toEqual(mockClaimResult);
    });
  });

  describe('getClaimablePositions', () => {
    it('calls PredictController.getClaimablePositions and returns positions', async () => {
      const mockClaimablePositions = [
        {
          id: 'claim-pos-1',
          providerId: 'polymarket',
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcome: 'Yes',
          outcomeTokenId: 'token-1',
          currentValue: 100,
          title: 'Test Market',
          icon: 'icon.png',
          amount: 10,
          price: 1.5,
          status: PredictPositionStatus.WON,
          size: 10,
          outcomeIndex: 0,
          realizedPnl: 5,
          percentPnl: 50,
          cashPnl: 5,
          claimable: true,
          initialValue: 10,
          avgPrice: 1.0,
          endDate: '2024-01-01T00:00:00Z',
          negRisk: false,
        },
      ];

      (
        Engine.context.PredictController.getClaimablePositions as jest.Mock
      ).mockResolvedValue(mockClaimablePositions);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.getClaimablePositions({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });

      expect(
        Engine.context.PredictController.getClaimablePositions,
      ).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });
      expect(response).toEqual(mockClaimablePositions);
    });

    it('handles errors from PredictController.getClaimablePositions', async () => {
      const mockError = new Error('Failed to fetch claimable positions');
      (
        Engine.context.PredictController.getClaimablePositions as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.getClaimablePositions({
          address: '0x1234567890123456789012345678901234567890',
          providerId: 'polymarket',
        }),
      ).rejects.toThrow('Failed to fetch claimable positions');
    });
  });

  describe('calculateBetAmounts', () => {
    it('calls PredictController.calculateBetAmounts and returns result', async () => {
      const mockBetAmounts = {
        toWin: 110,
        sharePrice: 1.1,
      };

      (
        Engine.context.PredictController.calculateBetAmounts as jest.Mock
      ).mockResolvedValue(mockBetAmounts);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.calculateBetAmounts({
        outcomeTokenId: 'outcome-token-123',
        userBetAmount: 100,
        providerId: 'polymarket',
      });

      expect(
        Engine.context.PredictController.calculateBetAmounts,
      ).toHaveBeenCalledWith({
        outcomeTokenId: 'outcome-token-123',
        userBetAmount: 100,
        providerId: 'polymarket',
      });
      expect(response).toEqual(mockBetAmounts);
    });

    it('handles errors from PredictController.calculateBetAmounts', async () => {
      const mockError = new Error('Failed to calculate bet amounts');
      (
        Engine.context.PredictController.calculateBetAmounts as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.calculateBetAmounts({
          outcomeTokenId: 'outcome-token-123',
          userBetAmount: 100,
          providerId: 'polymarket',
        }),
      ).rejects.toThrow('Failed to calculate bet amounts');
    });
  });

  describe('calculateCashOutAmounts', () => {
    it('calls PredictController.calculateCashOutAmounts and returns result', async () => {
      const mockCashOutAmounts = {
        currentValue: 110,
        cashPnl: 10,
        percentPnl: 10,
      };

      (
        Engine.context.PredictController.calculateCashOutAmounts as jest.Mock
      ).mockResolvedValue(mockCashOutAmounts);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.calculateCashOutAmounts({
        outcomeTokenId: 'outcome-token-123',
        marketId: 'market-1',
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });

      expect(
        Engine.context.PredictController.calculateCashOutAmounts,
      ).toHaveBeenCalledWith({
        outcomeTokenId: 'outcome-token-123',
        marketId: 'market-1',
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });
      expect(response).toEqual(mockCashOutAmounts);
    });

    it('handles errors from PredictController.calculateCashOutAmounts', async () => {
      const mockError = new Error('Failed to calculate cash out amounts');
      (
        Engine.context.PredictController.calculateCashOutAmounts as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.calculateCashOutAmounts({
          outcomeTokenId: 'outcome-token-123',
          marketId: 'market-1',
          address: '0x1234567890123456789012345678901234567890',
          providerId: 'polymarket',
        }),
      ).rejects.toThrow('Failed to calculate cash out amounts');
    });
  });

  describe('getBalance', () => {
    it('calls PredictController.getBalance and returns balance', async () => {
      const mockBalance = 1500.75;

      (
        Engine.context.PredictController.getBalance as jest.Mock
      ).mockResolvedValue(mockBalance);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.getBalance({
        providerId: 'polymarket',
        address: '0x1234567890123456789012345678901234567890',
      });

      expect(Engine.context.PredictController.getBalance).toHaveBeenCalledWith({
        providerId: 'polymarket',
        address: '0x1234567890123456789012345678901234567890',
      });
      expect(response).toBe(mockBalance);
    });

    it('handles errors from PredictController.getBalance', async () => {
      const mockError = new Error('Failed to fetch balance');
      (
        Engine.context.PredictController.getBalance as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.getBalance({
          providerId: 'polymarket',
          address: '0x1234567890123456789012345678901234567890',
        }),
      ).rejects.toThrow('Failed to fetch balance');
    });

    it('calls getBalance with default address when not provided', async () => {
      const mockBalance = 500.0;

      (
        Engine.context.PredictController.getBalance as jest.Mock
      ).mockResolvedValue(mockBalance);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.getBalance({
        providerId: 'polymarket',
      });

      // The hook calls the controller directly, so the controller handles the default address
      expect(Engine.context.PredictController.getBalance).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
      expect(response).toBe(mockBalance);
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePredictTrading());

      const initialGetPositions = result.current.getPositions;
      const initialGetClaimablePositions = result.current.getClaimablePositions;
      const initialPlaceOrder = result.current.placeOrder;
      const initialClaim = result.current.claim;
      const initialCalculateBetAmounts = result.current.calculateBetAmounts;
      const initialCalculateCashOutAmounts =
        result.current.calculateCashOutAmounts;
      const initialGetBalance = result.current.getBalance;

      rerender({});

      expect(result.current.getPositions).toBe(initialGetPositions);
      expect(result.current.getClaimablePositions).toBe(
        initialGetClaimablePositions,
      );
      expect(result.current.placeOrder).toBe(initialPlaceOrder);
      expect(result.current.claim).toBe(initialClaim);
      expect(result.current.calculateBetAmounts).toBe(
        initialCalculateBetAmounts,
      );
      expect(result.current.calculateCashOutAmounts).toBe(
        initialCalculateCashOutAmounts,
      );
      expect(result.current.getBalance).toBe(initialGetBalance);
    });
  });
});
