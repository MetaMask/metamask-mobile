import { Platform } from 'react-native';
import type { Position, PriceUpdate } from '@metamask/perps-controller';

import ReduxService from '../../../../core/redux/ReduxService';
import { PerpsPnlLiveActivity } from '../../../../core/Widgets/liveActivities/PerpsPnlLiveActivity';
import { endLiveActivitiesFromPreviousLaunch } from '../../../../core/Widgets/reconcileLiveActivities';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { enrichPositionsWithLivePnL } from '../hooks/stream/usePerpsLivePositions';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';
import { PerpsLiveActivityServiceImplementation } from './PerpsLiveActivityService';

jest.mock('../providers/PerpsStreamManager', () => ({
  getStreamManagerInstance: jest.fn(),
}));

jest.mock(
  '../../../../core/Widgets/liveActivities/PerpsPnlLiveActivity',
  () => ({
    PERPS_PNL_LIVE_ACTIVITY_NAME: 'PerpsPnlLiveActivity',
    PerpsPnlLiveActivity: { start: jest.fn(), getInstances: jest.fn(() => []) },
  }),
);

jest.mock('../../../../core/Widgets/reconcileLiveActivities', () => ({
  endLiveActivitiesFromPreviousLaunch: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(),
}));

// The P/L math itself is covered by usePerpsLivePositions' own tests; here we
// only care that the service feeds it the right position + price snapshot and
// renders whatever it returns.
jest.mock('../hooks/stream/usePerpsLivePositions', () => ({
  enrichPositionsWithLivePnL: jest.fn((positions) => positions),
}));

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  strings: jest.fn((key: string, params?: Record<string, string>) =>
    params ? `${key}:${Object.values(params).join('|')}` : key,
  ),
  default: { locale: 'en-US' },
}));

jest.mock('../utils/formatUtils', () => ({
  formatPnl: jest.fn((value: number) => `pnl(${value})`),
  formatPercentage: jest.fn((value: number) => `pct(${value})`),
  formatPerpsPrice: jest.fn((value: string | number) => `price(${value})`),
  formatLeverage: jest.fn((value: number) => `${value}x`),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

function buildPosition(overrides: Partial<Position> = {}): Position {
  return {
    symbol: 'BTC',
    size: '0.5',
    entryPrice: '60000',
    positionValue: '32500',
    unrealizedPnl: '2500',
    marginUsed: '3000',
    leverage: { type: 'isolated', value: 10 },
    liquidationPrice: '55000',
    maxLeverage: 40,
    returnOnEquity: '0.25',
    cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
    takeProfitCount: 0,
    stopLossCount: 0,
    ...overrides,
  };
}

describe('PerpsLiveActivityService', () => {
  const mockSelectPrivacyMode = jest.mocked(selectPrivacyMode);
  const mockGetStreamManagerInstance = jest.mocked(getStreamManagerInstance);
  const mockEnrich = jest.mocked(enrichPositionsWithLivePnL);
  const mockStart = jest.mocked(PerpsPnlLiveActivity.start);

  let service: PerpsLiveActivityServiceImplementation;
  let activity: { update: jest.Mock; end: jest.Mock };
  let unsubscribeFromPositions: jest.Mock;
  let unsubscribeFromPrices: jest.Mock;
  let emitPositions: ((positions: Position[] | null) => void) | undefined;
  let emitPrices: ((prices: Record<string, PriceUpdate>) => void) | undefined;
  let subscribeToSymbols: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    process.env.MM_WIDGETS_ENABLED = 'true';

    emitPositions = undefined;
    emitPrices = undefined;
    unsubscribeFromPositions = jest.fn();
    unsubscribeFromPrices = jest.fn();

    subscribeToSymbols = jest.fn(
      ({
        callback,
      }: {
        callback: (prices: Record<string, PriceUpdate>) => void;
      }) => {
        emitPrices = callback;
        return unsubscribeFromPrices;
      },
    );

    mockGetStreamManagerInstance.mockReturnValue({
      positions: {
        subscribe: jest.fn(
          ({
            callback,
          }: {
            callback: (positions: Position[] | null) => void;
          }) => {
            emitPositions = callback;
            return unsubscribeFromPositions;
          },
        ),
      },
      prices: { subscribeToSymbols },
    } as never);

    activity = {
      update: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
    };
    mockStart.mockReturnValue(activity as never);

    mockEnrich.mockImplementation((positions) => positions);
    mockSelectPrivacyMode.mockReturnValue(false);

    ReduxService.store = {
      getState: jest.fn(() => ({}) as never),
      dispatch: jest.fn(),
      subscribe: jest.fn(),
    } as never;

    service = PerpsLiveActivityServiceImplementation.getInstance();
    service.stop();
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.stop();
  });

  describe('start gating', () => {
    it('does nothing when MM_WIDGETS_ENABLED is not true', () => {
      process.env.MM_WIDGETS_ENABLED = 'false';

      service.start();

      expect(mockGetStreamManagerInstance).not.toHaveBeenCalled();
    });

    it('does nothing on Android, where Live Activities do not exist', () => {
      Platform.OS = 'android';

      service.start();

      expect(mockGetStreamManagerInstance).not.toHaveBeenCalled();
    });

    it('subscribes to the position stream only once across repeated start calls', () => {
      service.start();
      service.start();

      expect(
        mockGetStreamManagerInstance().positions.subscribe,
      ).toHaveBeenCalledTimes(1);
    });

    it('ends activities orphaned by a previous launch before driving its own', () => {
      service.start();

      expect(endLiveActivitiesFromPreviousLaunch).toHaveBeenCalledWith(
        PerpsPnlLiveActivity,
      );
    });
  });

  describe('starting an activity', () => {
    it('starts one with formatted, translated props for the open position', () => {
      service.start();

      emitPositions?.([buildPosition()]);

      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          directionLabel:
            'widgets.perps_pnl_live_activity.direction:perps.market.long|10x',
          isProfit: true,
          pnlLabel: 'perps.unrealized_pnl',
          pnlDisplay: 'pnl(2500)',
          roeDisplay: 'pct(25)',
          entryPriceDisplay: 'price(60000)',
        }),
      );
    });

    it('passes both light and dark themes so the card follows the system appearance', () => {
      service.start();

      emitPositions?.([buildPosition()]);

      const props = mockStart.mock.calls[0][0];
      expect(props.theme.light.colorScheme).toBe('light');
      expect(props.theme.dark.colorScheme).toBe('dark');
    });

    it('marks a losing position as not profitable so the layout colors it red', () => {
      service.start();

      emitPositions?.([buildPosition({ unrealizedPnl: '-800' })]);

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ isProfit: false, pnlDisplay: 'pnl(-800)' }),
      );
    });

    it('labels a negative size as a short', () => {
      service.start();

      emitPositions?.([buildPosition({ size: '-0.5' })]);

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          directionLabel:
            'widgets.perps_pnl_live_activity.direction:perps.market.short|10x',
        }),
      );
    });

    it('shows the largest position by notional value when several are open', () => {
      service.start();

      emitPositions?.([
        buildPosition({ symbol: 'DOGE', positionValue: '120' }),
        buildPosition({ symbol: 'ETH', positionValue: '9000' }),
        buildPosition({ symbol: 'SOL', positionValue: '400' }),
      ]);

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'ETH' }),
      );
    });

    it('derives the mark price from the position until the first price tick arrives', () => {
      service.start();

      // positionValue 32500 over size 0.5 implies a 65000 mark price.
      emitPositions?.([buildPosition()]);

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ markPriceDisplay: 'price(65000)' }),
      );
    });
  });

  describe('live price updates', () => {
    it('subscribes to prices for just the displayed symbol', () => {
      service.start();

      emitPositions?.([buildPosition({ symbol: 'ETH' })]);

      expect(subscribeToSymbols).toHaveBeenCalledWith(
        expect.objectContaining({ symbols: ['ETH'] }),
      );
    });

    it('re-scopes the price subscription when a different position becomes the largest', () => {
      service.start();
      emitPositions?.([buildPosition({ symbol: 'ETH' })]);
      subscribeToSymbols.mockClear();

      emitPositions?.([
        buildPosition({ symbol: 'ETH', positionValue: '100' }),
        buildPosition({ symbol: 'BTC', positionValue: '50000' }),
      ]);

      expect(unsubscribeFromPrices).toHaveBeenCalled();
      expect(subscribeToSymbols).toHaveBeenCalledWith(
        expect.objectContaining({ symbols: ['BTC'] }),
      );
    });

    it('recomputes P/L from the latest mark price and updates rather than restarting', () => {
      service.start();
      emitPositions?.([buildPosition()]);

      mockEnrich.mockImplementation(([position]) => [
        { ...position, unrealizedPnl: '3100', returnOnEquity: '0.31' },
      ]);
      emitPrices?.({
        BTC: { symbol: 'BTC', price: '66200', timestamp: 1, isTradable: true },
      });

      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(activity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pnlDisplay: 'pnl(3100)',
          roeDisplay: 'pct(31)',
          markPriceDisplay: 'price(66200)',
        }),
      );
    });

    it('feeds the price snapshot into the shared P/L enrichment', () => {
      service.start();
      emitPositions?.([buildPosition()]);

      const prices = {
        BTC: { symbol: 'BTC', price: '66200', timestamp: 1, isTradable: true },
      };
      emitPrices?.(prices);

      expect(mockEnrich).toHaveBeenLastCalledWith(
        [expect.objectContaining({ symbol: 'BTC' })],
        prices,
      );
    });

    it('discards cached prices when the channel signals a cache clear', () => {
      service.start();
      emitPositions?.([buildPosition()]);
      emitPrices?.({
        BTC: { symbol: 'BTC', price: '66200', timestamp: 1, isTradable: true },
      });

      emitPrices?.({});

      expect(mockEnrich).toHaveBeenLastCalledWith(expect.anything(), {});
    });

    it('skips the ActivityKit write when the computed props are unchanged', () => {
      service.start();
      emitPositions?.([buildPosition()]);

      emitPositions?.([buildPosition()]);

      expect(activity.update).not.toHaveBeenCalled();
    });
  });

  describe('ending an activity', () => {
    it('ends immediately once the last position is closed', () => {
      service.start();
      emitPositions?.([buildPosition()]);

      emitPositions?.([]);

      expect(activity.end).toHaveBeenCalledWith('immediate');
    });

    it('ends on the account-switch clear signal rather than showing another account\u2019s P/L', () => {
      service.start();
      emitPositions?.([buildPosition()]);

      emitPositions?.(null);

      expect(activity.end).toHaveBeenCalledWith('immediate');
    });

    it('starts a fresh activity after a close, instead of reusing the ended handle', () => {
      service.start();
      emitPositions?.([buildPosition()]);
      emitPositions?.([]);

      emitPositions?.([buildPosition()]);

      expect(mockStart).toHaveBeenCalledTimes(2);
    });

    it('unsubscribes from both streams and ends the activity on stop', () => {
      service.start();
      emitPositions?.([buildPosition()]);

      service.stop();

      expect(unsubscribeFromPositions).toHaveBeenCalled();
      expect(unsubscribeFromPrices).toHaveBeenCalled();
      expect(activity.end).toHaveBeenCalledWith('immediate');
    });
  });

  describe('privacy mode', () => {
    it('never starts an activity, since the Lock Screen is readable while locked', () => {
      mockSelectPrivacyMode.mockReturnValue(true);
      service.start();

      emitPositions?.([buildPosition()]);

      expect(mockStart).not.toHaveBeenCalled();
    });

    it('ends a running activity when privacy mode is switched on', () => {
      service.start();
      emitPositions?.([buildPosition()]);

      mockSelectPrivacyMode.mockReturnValue(true);
      emitPositions?.([buildPosition({ unrealizedPnl: '2600' })]);

      expect(activity.end).toHaveBeenCalledWith('immediate');
    });
  });

  describe('when ActivityKit refuses the request', () => {
    it('stops retrying after three consecutive failures', () => {
      mockStart.mockImplementation(() => {
        throw new Error('Live Activities are disabled');
      });
      service.start();

      for (let attempt = 0; attempt < 5; attempt++) {
        emitPositions?.([buildPosition({ unrealizedPnl: `${attempt}` })]);
      }

      expect(mockStart).toHaveBeenCalledTimes(3);
    });

    it('retries on the next update rather than treating the failed props as delivered', () => {
      mockStart.mockImplementationOnce(() => {
        throw new Error('app is backgrounded');
      });
      service.start();

      emitPositions?.([buildPosition()]);
      emitPositions?.([buildPosition()]);

      expect(mockStart).toHaveBeenCalledTimes(2);
    });
  });
});
