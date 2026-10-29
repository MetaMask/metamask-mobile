import { PREDICT_ERROR_CODES } from '../constants/errors';
import {
  PredictMarketStatus,
  type OrderPreview,
  type PredictMarket,
  type PredictOutcome,
} from '../types';
import { getNonBettableMarketErrorCode } from './marketState';

const OUTCOME_ID = 'condition-1';

const createOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome =>
  ({
    id: OUTCOME_ID,
    status: PredictMarketStatus.OPEN,
    active: true,
    acceptingOrders: true,
    ...overrides,
  }) as PredictOutcome;

const createMarket = (outcome: PredictOutcome): PredictMarket =>
  ({
    id: 'market-1',
    status: PredictMarketStatus.OPEN,
    active: true,
    outcomes: [outcome],
  }) as PredictMarket;

const preview = { outcomeId: OUTCOME_ID } as OrderPreview;

describe('getNonBettableMarketErrorCode', () => {
  describe('Protocol V2 resolution status', () => {
    it('treats an open market with resolutionStatus "active" as bettable', () => {
      const market = createMarket(
        createOutcome({ version: 'v2', resolutionStatus: 'active' }),
      );

      expect(getNonBettableMarketErrorCode(market, preview)).toBeUndefined();
    });

    it('rejects a market with resolutionStatus "resolved"', () => {
      const market = createMarket(
        createOutcome({ version: 'v2', resolutionStatus: 'resolved' }),
      );

      expect(getNonBettableMarketErrorCode(market, preview)).toBe(
        PREDICT_ERROR_CODES.MARKET_NOT_ACCEPTING_BETS,
      );
    });

    it('rejects a market with resolutionStatus "inactive" that is not accepting orders', () => {
      const market = createMarket(
        createOutcome({
          version: 'v2',
          resolutionStatus: 'inactive',
          acceptingOrders: false,
        }),
      );

      expect(getNonBettableMarketErrorCode(market, preview)).toBe(
        PREDICT_ERROR_CODES.MARKET_NOT_ACCEPTING_BETS,
      );
    });
  });

  describe('UMA resolution status', () => {
    it('treats an open market without a resolution status as bettable', () => {
      const market = createMarket(createOutcome());

      expect(getNonBettableMarketErrorCode(market, preview)).toBeUndefined();
    });

    it.each(['proposed', 'disputed'])(
      'rejects a market with UMA status "%s" as pending resolution',
      (resolutionStatus) => {
        const market = createMarket(createOutcome({ resolutionStatus }));

        expect(getNonBettableMarketErrorCode(market, preview)).toBe(
          PREDICT_ERROR_CODES.MARKET_PENDING_RESOLUTION,
        );
      },
    );

    it('rejects a market with UMA status "resolved"', () => {
      const market = createMarket(
        createOutcome({ resolutionStatus: 'resolved' }),
      );

      expect(getNonBettableMarketErrorCode(market, preview)).toBe(
        PREDICT_ERROR_CODES.MARKET_NOT_ACCEPTING_BETS,
      );
    });
  });

  it('reports a failed check when the previewed outcome is missing', () => {
    const market = createMarket(createOutcome({ id: 'other-condition' }));

    expect(getNonBettableMarketErrorCode(market, preview)).toBe(
      PREDICT_ERROR_CODES.MARKET_BETTABLE_CHECK_FAILED,
    );
  });
});
