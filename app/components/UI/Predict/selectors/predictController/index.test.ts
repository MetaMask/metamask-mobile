import {
  selectPredictControllerState,
  selectPredictClaimablePositions,
  selectPredictPendingDeposits,
  selectPredictWonPositions,
  selectPredictWinFiat,
  selectPredictWinPnl,
  selectPredictBalances,
  selectPredictBalanceByAddress,
} from './index';
import { PredictPositionStatus } from '../../types';

describe('Predict Controller Selectors', () => {
  describe('selectPredictControllerState', () => {
    it('selects the PredictController state', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              eligibility: {},
              lastError: null,
              lastUpdateTimestamp: 0,
              claimTransaction: null,
              depositTransaction: null,
              isOnboarded: {},
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictControllerState(mockState as any);

      expect(result).toEqual(
        mockState.engine.backgroundState.PredictController,
      );
    });
  });

  describe('selectPredictPendingDeposits', () => {
    it('returns deposit transaction when it exists', () => {
      const pendingDeposits = {
        polymarket: {
          '0x123': true,
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              pendingDeposits,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictPendingDeposits(mockState as any);

      expect(result).toEqual(pendingDeposits);
    });

    it('returns empty object when pending deposits do not exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              pendingDeposits: {},
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictPendingDeposits(mockState as any);

      expect(result).toEqual({});
    });

    it('returns empty object when PredictController state is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: undefined,
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictPendingDeposits(mockState as any);

      expect(result).toEqual({});
    });
  });

  describe('selectPredictClaimablePositions', () => {
    it('returns claimable positions when they exist', () => {
      const claimablePositions = [
        {
          id: 'pos-1',
          providerId: 'polymarket',
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcome: 'Yes',
          outcomeTokenId: '123',
          currentValue: 100,
          title: 'Test Market',
          icon: 'icon-url',
          amount: 50,
          price: 0.5,
          status: PredictPositionStatus.WON,
          size: 100,
          outcomeIndex: 0,
          percentPnl: 50,
          cashPnl: 25,
          claimable: true,
          initialValue: 75,
          avgPrice: 0.75,
          endDate: '2024-12-31',
        },
      ];

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictClaimablePositions(mockState as any);

      expect(result).toEqual(claimablePositions);
    });

    it('returns empty array when claimable positions do not exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: null,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictClaimablePositions(mockState as any);

      expect(result).toEqual([]);
    });

    it('returns empty array when PredictController state is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: undefined,
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictClaimablePositions(mockState as any);

      expect(result).toEqual([]);
    });
  });

  describe('selectPredictWonPositions', () => {
    it('filters positions with WON status', () => {
      const claimablePositions = [
        {
          id: 'pos-1',
          providerId: 'polymarket',
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcome: 'Yes',
          outcomeTokenId: '123',
          currentValue: 100,
          title: 'Test Market',
          icon: 'icon-url',
          amount: 50,
          price: 0.5,
          status: PredictPositionStatus.WON,
          size: 100,
          outcomeIndex: 0,
          percentPnl: 50,
          cashPnl: 25,
          claimable: true,
          initialValue: 75,
          avgPrice: 0.75,
          endDate: '2024-12-31',
        },
        {
          id: 'pos-2',
          providerId: 'polymarket',
          marketId: 'market-2',
          outcomeId: 'outcome-2',
          outcome: 'No',
          outcomeTokenId: '456',
          currentValue: 0,
          title: 'Test Market 2',
          icon: 'icon-url-2',
          amount: 30,
          price: 0.3,
          status: PredictPositionStatus.LOST,
          size: 100,
          outcomeIndex: 1,
          percentPnl: -100,
          cashPnl: -30,
          claimable: false,
          initialValue: 30,
          avgPrice: 0.3,
          endDate: '2024-12-31',
        },
      ];

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictWonPositions(mockState as any);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(PredictPositionStatus.WON);
      expect(result[0].id).toBe('pos-1');
    });

    it('returns empty array when no positions have WON status', () => {
      const claimablePositions = [
        {
          id: 'pos-1',
          providerId: 'polymarket',
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcome: 'Yes',
          outcomeTokenId: '123',
          currentValue: 0,
          title: 'Test Market',
          icon: 'icon-url',
          amount: 50,
          price: 0.5,
          status: PredictPositionStatus.LOST,
          size: 100,
          outcomeIndex: 0,
          percentPnl: -100,
          cashPnl: -50,
          claimable: false,
          initialValue: 50,
          avgPrice: 0.5,
          endDate: '2024-12-31',
        },
      ];

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictWonPositions(mockState as any);

      expect(result).toEqual([]);
    });

    it('returns empty array when claimable positions is empty', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: [],
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictWonPositions(mockState as any);

      expect(result).toEqual([]);
    });
  });

  describe('selectPredictWinFiat', () => {
    it('calculates total current value from winning positions', () => {
      const claimablePositions = [
        {
          id: 'pos-1',
          providerId: 'polymarket',
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcome: 'Yes',
          outcomeTokenId: '123',
          currentValue: 100,
          title: 'Test Market',
          icon: 'icon-url',
          amount: 50,
          price: 0.5,
          status: PredictPositionStatus.WON,
          size: 100,
          outcomeIndex: 0,
          percentPnl: 50,
          cashPnl: 25,
          claimable: true,
          initialValue: 75,
          avgPrice: 0.75,
          endDate: '2024-12-31',
        },
        {
          id: 'pos-2',
          providerId: 'polymarket',
          marketId: 'market-2',
          outcomeId: 'outcome-2',
          outcome: 'Yes',
          outcomeTokenId: '456',
          currentValue: 200,
          title: 'Test Market 2',
          icon: 'icon-url-2',
          amount: 150,
          price: 0.75,
          status: PredictPositionStatus.WON,
          size: 200,
          outcomeIndex: 0,
          percentPnl: 33.33,
          cashPnl: 50,
          claimable: true,
          initialValue: 150,
          avgPrice: 0.75,
          endDate: '2024-12-31',
        },
      ];

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictWinFiat(mockState as any);

      expect(result).toBe(300);
    });

    it('returns zero when no winning positions exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: [],
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictWinFiat(mockState as any);

      expect(result).toBe(0);
    });

    it('returns zero when only LOST positions exist', () => {
      const claimablePositions = [
        {
          id: 'pos-1',
          providerId: 'polymarket',
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcome: 'Yes',
          outcomeTokenId: '123',
          currentValue: 0,
          title: 'Test Market',
          icon: 'icon-url',
          amount: 50,
          price: 0.5,
          status: PredictPositionStatus.LOST,
          size: 100,
          outcomeIndex: 0,
          percentPnl: -100,
          cashPnl: -50,
          claimable: false,
          initialValue: 50,
          avgPrice: 0.5,
          endDate: '2024-12-31',
        },
      ];

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictWinFiat(mockState as any);

      expect(result).toBe(0);
    });
  });

  describe('selectPredictWinPnl', () => {
    it('calculates total cash PnL from winning positions', () => {
      const claimablePositions = [
        {
          id: 'pos-1',
          providerId: 'polymarket',
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcome: 'Yes',
          outcomeTokenId: '123',
          currentValue: 100,
          title: 'Test Market',
          icon: 'icon-url',
          amount: 50,
          price: 0.5,
          status: PredictPositionStatus.WON,
          size: 100,
          outcomeIndex: 0,
          percentPnl: 50,
          cashPnl: 25,
          claimable: true,
          initialValue: 75,
          avgPrice: 0.75,
          endDate: '2024-12-31',
        },
        {
          id: 'pos-2',
          providerId: 'polymarket',
          marketId: 'market-2',
          outcomeId: 'outcome-2',
          outcome: 'Yes',
          outcomeTokenId: '456',
          currentValue: 200,
          title: 'Test Market 2',
          icon: 'icon-url-2',
          amount: 150,
          price: 0.75,
          status: PredictPositionStatus.WON,
          size: 200,
          outcomeIndex: 0,
          percentPnl: 33.33,
          cashPnl: 50,
          claimable: true,
          initialValue: 150,
          avgPrice: 0.75,
          endDate: '2024-12-31',
        },
      ];

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictWinPnl(mockState as any);

      expect(result).toBe(75);
    });

    it('returns zero when no winning positions exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: [],
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictWinPnl(mockState as any);

      expect(result).toBe(0);
    });

    it('calculates negative PnL when winning positions have negative cash PnL', () => {
      const claimablePositions = [
        {
          id: 'pos-1',
          providerId: 'polymarket',
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcome: 'Yes',
          outcomeTokenId: '123',
          currentValue: 100,
          title: 'Test Market',
          icon: 'icon-url',
          amount: 50,
          price: 0.5,
          status: PredictPositionStatus.WON,
          size: 100,
          outcomeIndex: 0,
          percentPnl: -10,
          cashPnl: -10,
          claimable: true,
          initialValue: 110,
          avgPrice: 1.1,
          endDate: '2024-12-31',
        },
      ];

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictWinPnl(mockState as any);

      expect(result).toBe(-10);
    });
  });

  describe('selectPredictBalances', () => {
    it('returns balances when they exist', () => {
      const balances = {
        polymarket: {
          '0x123': 1000,
          '0x456': 2000,
        },
        kalshi: {
          '0xabc': 500,
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              balances,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictBalances(mockState as any);

      expect(result).toEqual(balances);
    });

    it('returns empty object when balances do not exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              balances: null,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictBalances(mockState as any);

      expect(result).toEqual({});
    });

    it('returns empty object when PredictController state is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: undefined,
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictBalances(mockState as any);

      expect(result).toEqual({});
    });

    it('returns empty object when balances is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {},
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictBalances(mockState as any);

      expect(result).toEqual({});
    });
  });

  describe('selectPredictBalanceByAddress', () => {
    it('returns balance for specified provider and address', () => {
      const balances = {
        polymarket: {
          '0x123': 1000,
          '0x456': 2000,
        },
        kalshi: {
          '0xabc': 500,
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              balances,
            },
          },
        },
      };

      const selector = selectPredictBalanceByAddress({
        providerId: 'polymarket',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toBe(1000);
    });

    it('returns zero when provider does not exist', () => {
      const balances = {
        polymarket: {
          '0x123': 1000,
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              balances,
            },
          },
        },
      };

      const selector = selectPredictBalanceByAddress({
        providerId: 'nonexistent',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toBe(0);
    });

    it('returns zero when address does not exist for provider', () => {
      const balances = {
        polymarket: {
          '0x123': 1000,
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              balances,
            },
          },
        },
      };

      const selector = selectPredictBalanceByAddress({
        providerId: 'polymarket',
        address: '0xnonexistent',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toBe(0);
    });

    it('returns zero when balances is empty object', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              balances: {},
            },
          },
        },
      };

      const selector = selectPredictBalanceByAddress({
        providerId: 'polymarket',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toBe(0);
    });

    it('returns zero when PredictController state is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: undefined,
          },
        },
      };

      const selector = selectPredictBalanceByAddress({
        providerId: 'polymarket',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toBe(0);
    });

    it('returns correct balance for different provider and address combinations', () => {
      const balances = {
        polymarket: {
          '0x123': 1000,
          '0x456': 2000,
        },
        kalshi: {
          '0xabc': 500,
          '0xdef': 750,
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              balances,
            },
          },
        },
      };

      const selector1 = selectPredictBalanceByAddress({
        providerId: 'polymarket',
        address: '0x456',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result1 = selector1(mockState as any);

      const selector2 = selectPredictBalanceByAddress({
        providerId: 'kalshi',
        address: '0xdef',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result2 = selector2(mockState as any);

      expect(result1).toBe(2000);
      expect(result2).toBe(750);
    });

    it('returns zero for balance with value of zero', () => {
      const balances = {
        polymarket: {
          '0x123': 0,
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              balances,
            },
          },
        },
      };

      const selector = selectPredictBalanceByAddress({
        providerId: 'polymarket',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toBe(0);
    });
  });
});
