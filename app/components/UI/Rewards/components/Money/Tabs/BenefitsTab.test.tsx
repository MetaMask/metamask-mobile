import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import BenefitsTab from './BenefitsTab';
import { BENEFITS_TAB_TEST_IDS } from './BenefitsTab.testIds';

const mockUseTrackRewardsPageView = jest.fn();

jest.mock('../../../hooks/useTrackRewardsPageView', () => ({
  __esModule: true,
  default: (params: unknown) => mockUseTrackRewardsPageView(params),
}));

jest.mock('../../../hooks/useBenefits', () => ({
  useBenefits: () => ({ getAllBenefits: jest.fn() }),
}));

describe('BenefitsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks the benefits page view', () => {
    const { getByTestId } = renderWithProvider(<BenefitsTab />);

    expect(getByTestId(BENEFITS_TAB_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(mockUseTrackRewardsPageView).toHaveBeenCalledWith({
      page_type: 'benefits',
    });
  });
});
