import {
  selectPredictControllerState,
  selectPredictClaimablePositions,
  selectPredictPendingDeposits,
  selectPredictWonPositions,
  selectPredictWinFiat,
  selectPredictWinPnl,
  selectPredictBalances,
  selectPredictBalanceByAddress,
  selectPredictAccountMeta,
  selectPredictAccountMetaByAddress,
} from './index';
import { PredictPosition, PredictPositionStatus } from '../../types';

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
              accountMeta: {},
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
      const testAddress = '0x123';
      const claimablePositions = {
        [testAddress]: [
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
        ],
      };

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

    it('returns empty object when claimable positions do not exist', () => {
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
      const result = selectPredictClaimablePositions(mockState as any);

      expect(result).toEqual({});
    });
  });

  describe('selectPredictWonPositions', () => {
    it('filters positions with WON status', () => {
      const testAddress = '0x123';
      const claimablePositions = {
        [testAddress]: [
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
        ],
      };

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
      const selector = selectPredictWonPositions({ address: testAddress });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any) as PredictPosition[];

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(PredictPositionStatus.WON);
      expect(result[0].id).toBe('pos-1');
    });

    it('returns empty array when no positions have WON status', () => {
      const testAddress = '0x123';
      const claimablePositions = {
        [testAddress]: [
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
        ],
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      const result = selectPredictWonPositions({ address: testAddress })(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockState as any,
      );

      expect(result).toEqual([]);
    });

    it('returns empty array when claimable positions is empty', () => {
      const testAddress = '0x123';
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: {
                [testAddress]: [],
              },
            },
          },
        },
      };

      const result = selectPredictWonPositions({ address: testAddress })(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockState as any,
      );

      expect(result).toEqual([]);
    });
  });

  describe('selectPredictWinFiat', () => {
    it('calculates total current value from winning positions', () => {
      const testAddress = '0x123';
      const claimablePositions = {
        [testAddress]: [
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
        ],
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      const result = selectPredictWinFiat({ address: testAddress })(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockState as any,
      );

      expect(result).toBe(300);
    });

    it('returns zero when no winning positions exist', () => {
      const testAddress = '0x123';
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: {
                [testAddress]: [],
              },
            },
          },
        },
      };

      const result = selectPredictWinFiat({ address: testAddress })(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockState as any,
      );

      expect(result).toBe(0);
    });

    it('returns zero when only LOST positions exist', () => {
      const testAddress = '0x123';
      const claimablePositions = {
        [testAddress]: [
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
        ],
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      const result = selectPredictWinFiat({ address: testAddress })(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockState as any,
      );

      expect(result).toBe(0);
    });
  });

  describe('selectPredictWinPnl', () => {
    it('calculates total cash PnL from winning positions', () => {
      const testAddress = '0x123';
      const claimablePositions = {
        [testAddress]: [
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
        ],
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      const result = selectPredictWinPnl({ address: testAddress })(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockState as any,
      );

      expect(result).toBe(75);
    });

    it('returns zero when no winning positions exist', () => {
      const testAddress = '0x123';
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: {
                [testAddress]: [],
              },
            },
          },
        },
      };

      const result = selectPredictWinPnl({ address: testAddress })(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockState as any,
      );

      expect(result).toBe(0);
    });

    it('calculates negative PnL when winning positions have negative cash PnL', () => {
      const testAddress = '0x123';
      const claimablePositions = {
        [testAddress]: [
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
        ],
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions,
            },
          },
        },
      };

      const result = selectPredictWinPnl({ address: testAddress })(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockState as any,
      );

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
          '0x123': {
            balance: 1000,
            validUntil: Date.now() + 1000,
          },
          '0x456': {
            balance: 2000,
            validUntil: Date.now() + 1000,
          },
        },
        kalshi: {
          '0xabc': {
            balance: 500,
            validUntil: Date.now() + 1000,
          },
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
          '0x123': {
            balance: 1000,
            validUntil: Date.now() + 1000,
          },
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
          '0x123': {
            balance: 1000,
            validUntil: Date.now() + 1000,
          },
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
          '0x123': {
            balance: 1000,
            validUntil: Date.now() + 1000,
          },
          '0x456': {
            balance: 2000,
            validUntil: Date.now() + 1000,
          },
        },
        kalshi: {
          '0xabc': {
            balance: 500,
            validUntil: Date.now() + 1000,
          },
          '0xdef': {
            balance: 750,
            validUntil: Date.now() + 1000,
          },
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
          '0x123': {
            balance: 0,
            validUntil: Date.now() + 1000,
          },
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

  describe('selectPredictAccountMeta', () => {
    it('returns account meta object when it exists', () => {
      const accountMeta = {
        polymarket: {
          '0x123': {
            isOnboarded: true,
          },
        },
        kalshi: {
          '0xabc': {
            isOnboarded: false,
          },
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              accountMeta,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictAccountMeta(mockState as any);

      expect(result).toEqual(accountMeta);
    });

    it('returns empty object when accountMeta does not exist', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              accountMeta: {},
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictAccountMeta(mockState as any);

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
      const result = selectPredictAccountMeta(mockState as any);

      expect(result).toEqual({});
    });

    it('returns multiple provider account metadata', () => {
      const accountMeta = {
        polymarket: {
          '0x123': {
            isOnboarded: true,
          },
          '0x456': {
            isOnboarded: false,
          },
        },
        kalshi: {
          '0xabc': {
            isOnboarded: true,
          },
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              accountMeta,
            },
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selectPredictAccountMeta(mockState as any);

      expect(result).toEqual(accountMeta);
    });
  });

  describe('selectPredictAccountMetaByAddress', () => {
    it('returns account meta when it exists for provider and address', () => {
      const accountMeta = {
        polymarket: {
          '0x123': {
            isOnboarded: true,
          },
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              accountMeta,
            },
          },
        },
      };

      const selector = selectPredictAccountMetaByAddress({
        providerId: 'polymarket',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toEqual({ isOnboarded: true });
    });

    it('returns account meta with false values when not onboarded or accepted', () => {
      const accountMeta = {
        polymarket: {
          '0x123': {
            isOnboarded: false,
          },
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              accountMeta,
            },
          },
        },
      };

      const selector = selectPredictAccountMetaByAddress({
        providerId: 'polymarket',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toEqual({ isOnboarded: false });
    });

    it('returns empty object when provider does not exist', () => {
      const accountMeta = {
        polymarket: {
          '0x123': {
            isOnboarded: true,
          },
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              accountMeta,
            },
          },
        },
      };

      const selector = selectPredictAccountMetaByAddress({
        providerId: 'kalshi',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toEqual({});
    });

    it('returns empty object when address does not exist for provider', () => {
      const accountMeta = {
        polymarket: {
          '0x123': {
            isOnboarded: true,
          },
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              accountMeta,
            },
          },
        },
      };

      const selector = selectPredictAccountMetaByAddress({
        providerId: 'polymarket',
        address: '0xNonExistent',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

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

      const selector = selectPredictAccountMetaByAddress({
        providerId: 'polymarket',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toEqual({});
    });

    it('returns correct value for different provider and address combinations', () => {
      const accountMeta = {
        polymarket: {
          '0x123': {
            isOnboarded: true,
          },
          '0x456': {
            isOnboarded: false,
          },
        },
        kalshi: {
          '0xabc': {
            isOnboarded: true,
          },
          '0xdef': {
            isOnboarded: false,
          },
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              accountMeta,
            },
          },
        },
      };

      const selector1 = selectPredictAccountMetaByAddress({
        providerId: 'polymarket',
        address: '0x456',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result1 = selector1(mockState as any);

      const selector2 = selectPredictAccountMetaByAddress({
        providerId: 'kalshi',
        address: '0xabc',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result2 = selector2(mockState as any);

      expect(result1).toEqual({ isOnboarded: false });
      expect(result2).toEqual({ isOnboarded: true });
    });

    it('returns account meta with partial onboarding', () => {
      const accountMeta = {
        polymarket: {
          '0x123': {
            isOnboarded: true,
          },
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              accountMeta,
            },
          },
        },
      };

      const selector = selectPredictAccountMetaByAddress({
        providerId: 'polymarket',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toEqual({ isOnboarded: true });
    });

    it('returns empty object when accountMeta object is empty', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              accountMeta: {},
            },
          },
        },
      };

      const selector = selectPredictAccountMetaByAddress({
        providerId: 'polymarket',
        address: '0x123',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = selector(mockState as any);

      expect(result).toEqual({});
    });
  });
});
