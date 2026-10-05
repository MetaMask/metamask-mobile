import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TokenDetailsTabBar, {
  TOKEN_DETAILS_TABS,
  TokenDetailsTab,
} from './TokenDetailsTabBar';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';

describe('TokenDetailsTabBar', () => {
  const mockOnTabPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Overview and Feed tabs in order', () => {
    const { getByTestId, getAllByText } = render(
      <TokenDetailsTabBar
        activeTab={TokenDetailsTab.Overview}
        onTabPress={mockOnTabPress}
      />,
    );

    expect(TOKEN_DETAILS_TABS).toEqual([
      TokenDetailsTab.Overview,
      TokenDetailsTab.Feed,
    ]);
    expect(getByTestId(TokenOverviewSelectorsIDs.TABS_BAR)).toBeOnTheScreen();
    expect(
      getByTestId(TokenOverviewSelectorsIDs.TAB_OVERVIEW),
    ).toBeOnTheScreen();
    expect(getByTestId(TokenOverviewSelectorsIDs.TAB_FEED)).toBeOnTheScreen();
    // Tab renders a hidden + visible label copy for layout; allow duplicates.
    expect(getAllByText('Overview').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Feed').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onTabPress with the tab key when a tab is pressed', () => {
    const { getByTestId } = render(
      <TokenDetailsTabBar
        activeTab={TokenDetailsTab.Overview}
        onTabPress={mockOnTabPress}
      />,
    );

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.TAB_FEED));

    expect(mockOnTabPress).toHaveBeenCalledWith(TokenDetailsTab.Feed);
  });

  it('uses the provided testID for the bar', () => {
    const { getByTestId } = render(
      <TokenDetailsTabBar
        activeTab={TokenDetailsTab.Feed}
        onTabPress={mockOnTabPress}
        testID={TokenOverviewSelectorsIDs.TABS_BAR_STICKY}
      />,
    );

    expect(
      getByTestId(TokenOverviewSelectorsIDs.TABS_BAR_STICKY),
    ).toBeOnTheScreen();
  });
});
