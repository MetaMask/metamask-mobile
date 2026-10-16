import { render, screen } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';
import LeaderboardShellTabPage from '../../../../Views/SocialLeaderboard/shell/LeaderboardShellTabPage';
import TokenDetailsHoldersTab from './HoldersTab';

jest.mock(
  '../../../../Views/SocialLeaderboard/shell/LeaderboardShellTabPage',
  () => jest.fn(() => null),
);

const mockLeaderboardPage = jest.mocked(LeaderboardShellTabPage);

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

describe('TokenDetailsHoldersTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeaderboardPage.mockImplementation(() => (
      <View testID="social-leaderboard-page" />
    ));
  });

  it('shows the same leaderboard page as Social', () => {
    render(<TokenDetailsHoldersTab assetId={assetId} />);

    expect(screen.getByTestId('social-leaderboard-page')).toBeOnTheScreen();
    expect(mockLeaderboardPage.mock.calls[0][0]).toEqual({
      containerTestID: 'token-details-v1-holders-leaderboard',
    });
  });

  it('keeps the page unscoped for another asset', () => {
    const otherAssetId =
      'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as CaipAssetType;

    render(<TokenDetailsHoldersTab assetId={otherAssetId} />);

    expect(mockLeaderboardPage.mock.calls[0][0]).toEqual({
      containerTestID: 'token-details-v1-holders-leaderboard',
    });
    expect(mockLeaderboardPage.mock.calls[0][0]).not.toHaveProperty('source');
  });
});
