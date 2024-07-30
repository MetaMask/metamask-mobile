import { RootState } from '../reducers';

import selectShowFiatInTestnets from './settings';

describe('selectShowFiatInTestnets', () => {
  it('returns showFiatOnTestnets from state', () => {
    const mockState = {
      settings: {
        showFiatOnTestnets: true,
      },
    };

    expect(selectShowFiatInTestnets(mockState as RootState)).toBe(true);
  });
});
