import { RootState } from '../reducers';

import {
  selectPrimaryCurrency,
  selectShowCustomNonce,
  selectShowFiatInTestnets,
  selectUseBlockieIcon,
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

describe('selectUseBlockieIcon', () => {
  it('returns useBlockieIcon from state', () => {
    const mockState = {
      settings: {
        useBlockieIcon: true,
      },
    };

    expect(selectUseBlockieIcon(mockState as RootState)).toBe(true);
  });
});
