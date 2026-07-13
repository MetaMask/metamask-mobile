import { inferPredictBreakdownCategory } from './inferPredictBreakdownCategory';

describe('inferPredictBreakdownCategory', () => {
  it('classifies sports from title', () => {
    expect(
      inferPredictBreakdownCategory({
        title: 'Will the Lakers win the NBA finals?',
      }),
    ).toBe('sports');
  });

  it('classifies politics from title', () => {
    expect(
      inferPredictBreakdownCategory({
        title: 'US election 2028 — Democrat wins?',
      }),
    ).toBe('politics');
  });

  it('classifies crypto from slug', () => {
    expect(
      inferPredictBreakdownCategory({
        title: 'Some market',
        slug: 'eth-price-above-4k',
      }),
    ).toBe('crypto');
  });

  it('falls back to other', () => {
    expect(
      inferPredictBreakdownCategory({
        title: 'Random unresolved market title',
      }),
    ).toBe('other');
  });
});
