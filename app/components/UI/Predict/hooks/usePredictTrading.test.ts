import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictTrading } from './usePredictTrading';
import { PredictPositionStatus, Side } from '../types';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPositions: jest.fn(),
      placeOrder: jest.fn(),
      claim: jest.fn(),
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
      });

      expect(Engine.context.PredictController.claim).toHaveBeenCalledWith({
        positions: mockClaimablePositions,
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
      });

      expect(Engine.context.PredictController.claim).toHaveBeenCalledWith({
        positions: [],
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
      });

      expect(Engine.context.PredictController.claim).toHaveBeenCalledWith({
        positions: singlePosition,
      });
      expect(response).toEqual(mockClaimResult);
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePredictTrading());

      const initialGetPositions = result.current.getPositions;
      const initialPlaceOrder = result.current.placeOrder;
      const initialClaim = result.current.claim;
      const initialCalculateBetAmounts = result.current.calculateBetAmounts;
      const initialCalculateCashOutAmounts =
        result.current.calculateCashOutAmounts;

      rerender({});

      expect(result.current.getPositions).toBe(initialGetPositions);
      expect(result.current.placeOrder).toBe(initialPlaceOrder);
      expect(result.current.claim).toBe(initialClaim);
      expect(result.current.calculateBetAmounts).toBe(
        initialCalculateBetAmounts,
      );
      expect(result.current.calculateCashOutAmounts).toBe(
        initialCalculateCashOutAmounts,
      );
    });
  });
});
