import { render, screen } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';
import { SocialLeaderboard } from '../../../SocialLeaderboard';
import TokenDetailsHoldersTab from './HoldersTab';

jest.mock('../../../SocialLeaderboard', () => ({
  SocialLeaderboard: jest.fn(() => null),
}));

const mockLeaderboard = jest.mocked(SocialLeaderboard);

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

const unscopedLeaderboard = {
  source: { kind: 'all' },
  location: 'token_details',
  showViewerRow: true,
};

describe('TokenDetailsHoldersTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeaderboard.mockImplementation(() => (
      <View testID="social-leaderboard" />
    ));
  });

  it('shows the Social leaderboard', () => {
    render(<TokenDetailsHoldersTab assetId={assetId} />);

    expect(screen.getByTestId('social-leaderboard')).toBeOnTheScreen();
    expect(mockLeaderboard.mock.calls[0][0]).toEqual(unscopedLeaderboard);
  });

  it('keeps the ranking unscoped for another asset', () => {
    const otherAssetId =
      'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as CaipAssetType;

    render(<TokenDetailsHoldersTab assetId={otherAssetId} />);

    expect(mockLeaderboard.mock.calls[0][0]).toEqual(unscopedLeaderboard);
  });
});
