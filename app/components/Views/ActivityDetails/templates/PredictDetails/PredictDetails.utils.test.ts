import { strings } from '../../../../../../locales/i18n';
import {
  getPolymarketActivityUrl,
  getPredictFundsSteps,
  getPredictFundsStepTitle,
} from './PredictDetails.utils';

const TS = 1_765_361_640_000;

describe('PredictDetails.utils', () => {
  describe('getPolymarketActivityUrl', () => {
    it('returns undefined for missing activity or a non-Polymarket provider', () => {
      expect(getPolymarketActivityUrl(undefined)).toBeUndefined();
      expect(
        getPolymarketActivityUrl({ providerId: 'other', eventSlug: 'x' }),
      ).toBeUndefined();
    });

    it('prefers eventSlug, falls back to slug, then the base URL', () => {
      expect(
        getPolymarketActivityUrl({
          providerId: 'polymarket',
          eventSlug: 'weather-markets',
          slug: 'ignored',
        }),
      ).toBe('https://polymarket.com/event/weather-markets');
      expect(
        getPolymarketActivityUrl({
          providerId: 'polymarket',
          slug: 'will-it-rain',
        }),
      ).toBe('https://polymarket.com/event/will-it-rain');
      expect(getPolymarketActivityUrl({ providerId: 'polymarket' })).toBe(
        'https://polymarket.com',
      );
    });

    it('encodes the slug', () => {
      expect(
        getPolymarketActivityUrl({
          providerId: 'polymarket',
          eventSlug: 'a b/c',
        }),
      ).toBe('https://polymarket.com/event/a%20b%2Fc');
    });
  });

  describe('getPredictFundsSteps', () => {
    it('marks every step completed on success', () => {
      const steps = getPredictFundsSteps('success', TS);
      expect(steps).toHaveLength(2);
      expect(steps.map((s) => s.status)).toEqual(['completed', 'completed']);
      expect(steps[0].subtext).toBeDefined();
    });

    it('marks the terminal step failed on failure', () => {
      const steps = getPredictFundsSteps('failed', TS);
      expect(steps[0].status).toBe('completed');
      expect(steps[1].status).toBe('failed');
      expect(steps[1].subtext).toBe(strings('transaction.failed'));
    });

    it('marks the terminal step pending otherwise', () => {
      const steps = getPredictFundsSteps('pending', TS);
      expect(steps[0].status).toBe('completed');
      expect(steps[1].status).toBe('pending');
      expect(steps[1].subtext).toBe(strings('transaction.pending'));
    });
  });

  describe('getPredictFundsStepTitle', () => {
    it('returns the matching title per status', () => {
      expect(getPredictFundsStepTitle('success', 2, 2)).toBe(
        strings('predict.transactions.steps.title_completed', { completed: 2 }),
      );
      expect(getPredictFundsStepTitle('failed', 1, 2)).toBe(
        strings('predict.transactions.steps.title_failed', {
          completed: 1,
          failed: 1,
        }),
      );
      expect(getPredictFundsStepTitle('pending', 1, 2)).toBe(
        strings('predict.transactions.steps.title_pending', {
          completed: 1,
          pending: 1,
        }),
      );
    });
  });
});
