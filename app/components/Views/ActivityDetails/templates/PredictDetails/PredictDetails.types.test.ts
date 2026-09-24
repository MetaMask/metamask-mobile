import { strings } from '../../../../../../locales/i18n';
import {
  formatPredictDate,
  getPredictFundsCtaLabel,
} from './PredictDetails.types';

describe('PredictDetails.types', () => {
  describe('formatPredictDate', () => {
    it('formats the timestamp to a date string containing the year', () => {
      const result = formatPredictDate(1_765_361_640_000);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\d{4}/);
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
