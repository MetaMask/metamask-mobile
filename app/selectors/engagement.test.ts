import { selectDataCollectionForMarketingEnabled } from './engagement';
import type { RootState } from '../reducers';

describe('engagement selectors', () => {
  it.each([
    [true, true],
    [false, false],
    [false, null],
  ])(
    'returns %s when dataCollectionForMarketing is %s',
    (expected, dataCollectionForMarketing) => {
      const state = {
        security: {
          dataCollectionForMarketing,
        },
      } as RootState;

      expect(selectDataCollectionForMarketingEnabled(state)).toBe(expected);
    },
  );
});
