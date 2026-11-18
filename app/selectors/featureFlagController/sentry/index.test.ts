import type { Json } from '@metamask/utils';
import { SENTRY_FLAG_KEY, selectSentryTransactionSampleRates } from '.';
import type { StateWithPartialEngine } from '../types';

function createState(flagValue?: Json): StateWithPartialEngine {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags:
            flagValue === undefined ? {} : { [SENTRY_FLAG_KEY]: flagValue },
          cacheTimestamp: 0,
        },
      },
    },
  };
}

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

  it.each<Json | undefined>([
    undefined,
    null,
    [],
    {},
    { transactionSampleRates: null },
    { transactionSampleRates: { 'Swap Quote Fetch': 0.25 } },
  ])('returns no rates for a missing or malformed flag (%j)', (flagValue) => {
    expect(
      selectSentryTransactionSampleRates(createState(flagValue)),
    ).toStrictEqual({});
  });
});
