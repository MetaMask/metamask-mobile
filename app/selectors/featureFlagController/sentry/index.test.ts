import type { Json } from '@metamask/utils';
import { SENTRY_FLAG_KEY, selectSentryTransactionSampleRates } from '.';
import { getInvalidMockedFeatureFlag } from '../mocks';

const createState = (flagValue?: Json) =>
  getInvalidMockedFeatureFlag(
    flagValue === undefined ? {} : { [SENTRY_FLAG_KEY]: flagValue },
  );

describe('selectSentryTransactionSampleRates', () => {
  it('keeps only rates in [0, 1]', () => {
    const state = createState({
      transactionSampleRates: {
        'Swap Quote Fetch': { android: 0.25, ios: 1.5 },
        Other: { android: -0.1, ios: '0.5' },
        Zero: { ios: 0 },
      },
    });

    expect(selectSentryTransactionSampleRates(state)).toStrictEqual({
      'Swap Quote Fetch': { android: 0.25 },
      Zero: { ios: 0 },
    });
  });

  it('applies a plain number to both platforms', () => {
    const state = createState({
      transactionSampleRates: { 'Swap Quote Fetch': 0.25, Zero: 0 },
    });

    expect(selectSentryTransactionSampleRates(state)).toStrictEqual({
      'Swap Quote Fetch': { android: 0.25, ios: 0.25 },
      Zero: { android: 0, ios: 0 },
    });
  });

  it('drops a plain number outside [0, 1]', () => {
    const state = createState({
      transactionSampleRates: { Negative: -0.1, TooHigh: 1.5, Text: '0.5' },
    });

    expect(selectSentryTransactionSampleRates(state)).toStrictEqual({});
  });

  it('parses plain numbers and per-platform objects together', () => {
    const state = createState({
      transactionSampleRates: {
        'Swap Quote Fetch': { android: 0.25 },
        'UI Startup': 0.1,
        Invalid: 2,
      },
    });

    expect(selectSentryTransactionSampleRates(state)).toStrictEqual({
      'Swap Quote Fetch': { android: 0.25 },
      'UI Startup': { android: 0.1, ios: 0.1 },
    });
  });

  it.each<Json | undefined>([
    undefined,
    null,
    [],
    {},
    { transactionSampleRates: null },
    { transactionSampleRates: { 'Swap Quote Fetch': [0.25] } },
  ])('returns no rates for a missing or malformed flag (%j)', (flagValue) => {
    expect(
      selectSentryTransactionSampleRates(createState(flagValue)),
    ).toStrictEqual({});
  });
});
