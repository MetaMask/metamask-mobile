import type { Json } from '@metamask/utils';
import { SENTRY_FLAG_KEY, selectSentryTransactionSampleRates } from '.';
import { getInvalidMockedFeatureFlag } from '../mocks';

const createState = (flagValue?: Json) =>
  getInvalidMockedFeatureFlag(
    flagValue === undefined ? {} : { [SENTRY_FLAG_KEY]: flagValue },
  );

const expiresAt = '2026-12-01T00:00:00Z';
const expiresAtMs = Date.parse(expiresAt);

describe('selectSentryTransactionSampleRates', () => {
  it('keeps only rates in [0, 1] and parses expiresAt', () => {
    const state = createState({
      transactionSampleRates: {
        'Swap Quote Fetch': { android: 0.25, ios: 1.5, expiresAt },
        Other: { android: -0.1, ios: '0.5', expiresAt },
        Zero: { ios: 0, expiresAt },
      },
    });

    expect(selectSentryTransactionSampleRates(state)).toStrictEqual({
      'Swap Quote Fetch': { android: 0.25, expiresAt: expiresAtMs },
      Zero: { ios: 0, expiresAt: expiresAtMs },
    });
  });

  it.each<[string, Json]>([
    ['missing', { android: 0.25 }],
    ['not a string', { android: 0.25, expiresAt: expiresAtMs }],
    ['unparseable', { android: 0.25, expiresAt: 'next week' }],
  ])('drops an entry whose expiresAt is %s', (_, entry) => {
    const state = createState({
      transactionSampleRates: { 'Swap Quote Fetch': entry },
    });

    expect(selectSentryTransactionSampleRates(state)).toStrictEqual({});
  });

  it.each<Json | undefined>([
    undefined,
    null,
    [],
    {},
    { transactionSampleRates: null },
    { transactionSampleRates: { 'Swap Quote Fetch': 0.25 } },
    { transactionSampleRates: { 'Swap Quote Fetch': [0.25] } },
  ])('returns no rates for a missing or malformed flag (%j)', (flagValue) => {
    expect(
      selectSentryTransactionSampleRates(createState(flagValue)),
    ).toStrictEqual({});
  });
});
