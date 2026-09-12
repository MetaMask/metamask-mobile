import { parsePredictBalance } from './portfolio';

const createBalance = (overrides = {}) => ({
  venueId: 'kalshi',
  currency: 'USD',
  available: '123.13',
  ...overrides,
});

describe('Predict API canonical Balance parser', () => {
  it('parses a canonical Balance', () => {
    const input = createBalance();

    expect(parsePredictBalance(input)).toEqual(input);
  });

  it('discards unknown fields', () => {
    const input = {
      ...createBalance(),
      balance_dollars: '123.13',
      venuePayload: 'discard',
    };

    expect(parsePredictBalance(input)).toEqual(createBalance());
  });

  it.each([
    ['a negative amount', '-1'],
    ['a zero-prefixed amount', '00.5'],
    ['an exponential amount', '1e3'],
    ['a non-numeric amount', 'free'],
    ['an empty amount', ''],
  ])('rejects %s as available', (_name, available) => {
    const input = createBalance({ available });

    expect(() => parsePredictBalance(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });

  it('rejects an available amount that is not a string', () => {
    const input = createBalance({ available: 5 });

    expect(() => parsePredictBalance(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });

  it('rejects a Balance for another Venue', () => {
    const input = createBalance({ venueId: 'other' });

    expect(() => parsePredictBalance(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });

  it('rejects a Balance in another currency', () => {
    const input = createBalance({ currency: 'EUR' });

    expect(() => parsePredictBalance(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });
});
