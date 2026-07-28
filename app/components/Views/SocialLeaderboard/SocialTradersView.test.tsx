import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SocialTradersView from './SocialTradersView';

const mockSelectSocialFeedEnabled = jest.fn();

jest.mock('../../../selectors/featureFlagController/socialLeaderboard', () => ({
  selectSocialFeedEnabled: (state: unknown) =>
    mockSelectSocialFeedEnabled(state),
}));

jest.mock('./TopTradersView', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <MockView testID="mock-leaderboard" />,
  };
});

jest.mock('./SocialTradersTabsView', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <MockView testID="mock-tabs" />,
  };
});

describe('SocialTradersView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the standalone leaderboard when the feed flag is off', () => {
    mockSelectSocialFeedEnabled.mockReturnValue(false);

    renderWithProvider(<SocialTradersView />);

    expect(screen.getByTestId('mock-leaderboard')).toBeOnTheScreen();
    expect(screen.queryByTestId('mock-tabs')).not.toBeOnTheScreen();
  });

  it('renders the tabbed container when the feed flag is on', () => {
    mockSelectSocialFeedEnabled.mockReturnValue(true);

    renderWithProvider(<SocialTradersView />);

    expect(screen.getByTestId('mock-tabs')).toBeOnTheScreen();
    expect(screen.queryByTestId('mock-leaderboard')).not.toBeOnTheScreen();
  });
});
