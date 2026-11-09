import type { PredictPortfolioSummary } from '../../../types';
import { getHomePnlRowState } from './homePnlRowState';

const ready = (
  unrealizedPnl: string,
  unrealizedPnlPercent?: string,
): { status: 'ready'; summary: PredictPortfolioSummary } => ({
  status: 'ready',
  summary: {
    unrealizedPnl,
    unrealizedPnlPercent,
  } as PredictPortfolioSummary,
});

describe('getHomePnlRowState', () => {
  it.each([
    ['a gain', ready('2.15', '4.06'), '+$2.15 (+4.06%)', 'positive'],
    ['a loss', ready('-12.34', '-3.80'), '-$12.34 (-3.80%)', 'negative'],
    ['no change', ready('0', '0'), '$0.00 (0.00%)', 'neutral'],
    [
      'a zero cost basis, without a percent',
      ready('1.00'),
      '+$1.00',
      'positive',
    ],
  ])('shows %s from the Summary', (_case, summary, valueText, tone) => {
    expect(getHomePnlRowState({ summary, isPrivacyMode: false })).toEqual({
      show: true,
      isLoading: false,
      valueText,
      tone,
    });
  });

  it('loads while the Summary loads', () => {
    expect(
      getHomePnlRowState({
        summary: { status: 'loading' },
        isPrivacyMode: false,
      }),
    ).toEqual({ show: true, isLoading: true, tone: 'neutral' });
  });

  it('says the PnL is unavailable when the Summary is missing or stale', () => {
    expect(
      getHomePnlRowState({
        summary: { status: 'error' },
        isPrivacyMode: false,
      }),
    ).toEqual({
      show: true,
      isLoading: false,
      valueText: 'Unavailable',
      tone: 'neutral',
    });
  });

  it('hides the row in privacy mode', () => {
    expect(
      getHomePnlRowState({ summary: ready('2.15'), isPrivacyMode: true }),
    ).toEqual({ show: false, isLoading: false, tone: 'neutral' });
  });
});
