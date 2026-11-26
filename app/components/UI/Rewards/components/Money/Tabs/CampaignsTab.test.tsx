import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import CampaignsTab from './CampaignsTab';
import { CAMPAIGNS_TAB_TEST_IDS } from './CampaignsTab.testIds';

const mockUseTrackRewardsPageView = jest.fn();

jest.mock('../../../hooks/useTrackRewardsPageView', () => ({
  __esModule: true,
  default: (params: unknown) => mockUseTrackRewardsPageView(params),
}));

jest.mock('../../Campaigns/CampaignsList', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="campaigns-list" />,
  };
});

describe('CampaignsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks the campaigns overview page view', () => {
    const { getByTestId } = renderWithProvider(<CampaignsTab />);

    expect(getByTestId(CAMPAIGNS_TAB_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(mockUseTrackRewardsPageView).toHaveBeenCalledWith({
      page_type: 'campaigns_overview',
    });
  });
});
