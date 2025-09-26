import { RootState } from '../reducers';

import {
  selectPrimaryCurrency,
  selectShowCustomNonce,
  selectShowFiatInTestnets,
} from './settings';

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

describe('selectPrimaryCurrency', () => {
  it('returns primaryCurrency from state', () => {
    const mockState = {
      settings: {
        primaryCurrency: 'USD',
      },
    };

    expect(selectPrimaryCurrency(mockState as RootState)).toBe('USD');
  });
});

describe('selectShowCustomNonce', () => {
  it('returns showCustomNonce from state', () => {
    const mockState = {
      settings: {
        showCustomNonce: false,
      },
    };

    expect(selectShowCustomNonce(mockState as RootState)).toBe(false);
  });
});
