import { strings } from '../../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../../util/activity-adapters';
import {
  asPredictActivityItem,
  formatPredictDate,
  getPredictActivity,
  getPredictFundsCtaLabel,
  getPredictFundsStepLabels,
} from './PredictDetails.types';

describe('PredictDetails.types', () => {
  describe('asPredictActivityItem', () => {
    it('returns the same reference (type cast)', () => {
      const item = { type: 'predictionPlaced' } as ActivityListItem;
      expect(asPredictActivityItem(item)).toBe(item);
    });
  });

  describe('getPredictActivity', () => {
    it('returns the predict data when raw is a predict activity', () => {
      const data = { id: 'p1' };
      const item = {
        raw: { type: 'predictActivity', data },
      } as unknown as ActivityListItem;
      expect(getPredictActivity(item)).toBe(data);
    });

    it('returns undefined for non-predict raw or missing raw', () => {
      expect(
        getPredictActivity({
          raw: { type: 'perpsTransaction', data: {} },
        } as unknown as ActivityListItem),
      ).toBeUndefined();
      expect(getPredictActivity({} as ActivityListItem)).toBeUndefined();
    });
  });

  describe('formatPredictDate', () => {
    it('formats the timestamp to a date string containing the year', () => {
      const result = formatPredictDate(1_765_361_640_000);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\d{4}/);
    });
  });

  describe('getPredictFundsStepLabels', () => {
    it('returns the two funds steps', () => {
      expect(getPredictFundsStepLabels()).toHaveLength(2);
    });
  });

  describe('getPredictFundsCtaLabel', () => {
    it('returns try-again on failure, else fund/withdraw by direction', () => {
      expect(getPredictFundsCtaLabel('failed', true)).toBe(
        strings('predict.transactions.try_again'),
      );
      expect(getPredictFundsCtaLabel('success', true)).toBe(
        strings('predict.transactions.fund_again'),
      );
      expect(getPredictFundsCtaLabel('success', false)).toBe(
        strings('predict.deposit.withdraw'),
      );
    });
  });
});
