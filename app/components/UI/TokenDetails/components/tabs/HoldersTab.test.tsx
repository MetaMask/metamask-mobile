import { render, screen } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';
import { SocialLeaderboard } from '../../../SocialLeaderboard';
import TokenDetailsHoldersTab from './HoldersTab';

jest.mock('../../../SocialLeaderboard', () => ({
  SocialLeaderboard: jest.fn(() => null),
}));

const mockSocialLeaderboard = jest.mocked(SocialLeaderboard);

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

describe('TokenDetailsHoldersTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocialLeaderboard.mockImplementation(() => (
      <View testID="social-leaderboard" />
    ));
  });

  it('shows the token leaderboard for this asset', () => {
    render(<TokenDetailsHoldersTab assetId={assetId} />);

    expect(screen.getByTestId('social-leaderboard')).toBeOnTheScreen();
    expect(mockSocialLeaderboard.mock.calls[0][0]).toEqual({
      source: { kind: 'token', assetId },
      location: 'token_details',
      showViewerRow: true,
    });
  });
});
