import { RootState } from '../reducers';

import {
  selectHasLinkedSocialLoginProfile,
  selectPrimaryCurrency,
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

describe('selectHasLinkedSocialLoginProfile', () => {
  it('returns the linked social profile marker from state', () => {
    const mockState = {
      settings: {
        hasLinkedSocialLoginProfile: true,
      },
    };

    expect(selectHasLinkedSocialLoginProfile(mockState as RootState)).toBe(
      true,
    );
  });
});
