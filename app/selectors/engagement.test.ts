import { selectDataCollectionForMarketingEnabled } from './engagement';
import type { RootState } from '../reducers';
import { engineWithMarketingConsent } from '../util/test/marketingConsentState';

describe('engagement selectors', () => {
  it.each([
    [true, true],
    [false, false],
    [false, null],
  ])(
    'returns %s when marketing consent is %s',
    (expected, marketingConsent) => {
      const state = {
        engine: engineWithMarketingConsent(marketingConsent),
      } as unknown as RootState;

      expect(selectDataCollectionForMarketingEnabled(state)).toBe(expected);
    },
  );
});
