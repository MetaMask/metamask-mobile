import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import LeaderboardShellTabPage from './LeaderboardShellTabPage';
import { getSubnavPillTestId } from './SubnavPills';

const TOP_TRADERS_TEST_ID = 'top-traders-view';

const mockTopTradersProps = jest.fn();

jest.mock('../TopTradersView', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockTopTradersProps(props);
      return ReactActual.createElement(View, { testID: 'top-traders-view' });
    },
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('LeaderboardShellTabPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the leaderboard subnav pills', () => {
    renderWithProvider(
      <LeaderboardShellTabPage containerTestID="leaderboard-page" />,
    );

    expect(
      screen.getByTestId(getSubnavPillTestId('topTraders')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSubnavPillTestId('topPerps')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(getSubnavPillTestId('kols'))).toBeOnTheScreen();
  });

  it('scopes the list to every position type', () => {
    renderWithProvider(
      <LeaderboardShellTabPage containerTestID="leaderboard-page" />,
    );

    expect(mockTopTradersProps).toHaveBeenCalledWith(
      expect.objectContaining({
        pinnedTypeFilter: 'all',
        rowVariant: 'socialV1',
      }),
    );
  });

  it('holds the list back until the tab is opened', () => {
    const { rerender } = renderWithProvider(
      <LeaderboardShellTabPage
        isActive={false}
        containerTestID="leaderboard-page"
      />,
    );

    expect(screen.queryByTestId(TOP_TRADERS_TEST_ID)).toBeNull();

    rerender(
      <LeaderboardShellTabPage isActive containerTestID="leaderboard-page" />,
    );

    expect(screen.getByTestId(TOP_TRADERS_TEST_ID)).toBeOnTheScreen();
  });

  it('keeps the list mounted once the tab has been opened', () => {
    const { rerender } = renderWithProvider(
      <LeaderboardShellTabPage isActive containerTestID="leaderboard-page" />,
    );

    rerender(
      <LeaderboardShellTabPage
        isActive={false}
        containerTestID="leaderboard-page"
      />,
    );

    expect(screen.getByTestId(TOP_TRADERS_TEST_ID)).toBeOnTheScreen();
  });
});
