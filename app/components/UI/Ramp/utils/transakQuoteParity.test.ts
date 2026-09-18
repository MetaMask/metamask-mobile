import type { Quote } from '../types';
import { acceptedAmountMatchesRequest } from './transakQuoteParity';

const ACCEPTED_QUOTE = {
  quote: {
    amountIn: 16.4,
  },
} as unknown as Quote;

describe('acceptedAmountMatchesRequest', () => {
  it('matches accepted and requested amounts at cent precision', () => {
    expect(acceptedAmountMatchesRequest(ACCEPTED_QUOTE, 16.404)).toBe(true);
  });

  it('rejects a changed aggregator amount', () => {
    expect(acceptedAmountMatchesRequest(ACCEPTED_QUOTE, 16.41)).toBe(false);
  });
});
