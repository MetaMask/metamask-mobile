import { render, screen } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';
import { SocialFeed } from '../../../SocialFeed';
import TokenDetailsFeedTab from './FeedTab';

jest.mock('../../../SocialFeed', () => ({
  SocialFeed: jest.fn(() => null),
}));

const mockSocialFeed = jest.mocked(SocialFeed);

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

describe('TokenDetailsFeedTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocialFeed.mockImplementation(() => <View testID="social-feed" />);
  });

  it('shows the token social feed on the token details surface', () => {
    render(<TokenDetailsFeedTab assetId={assetId} />);

    expect(screen.getByTestId('social-feed')).toBeOnTheScreen();
    expect(mockSocialFeed.mock.calls[0][0]).toEqual({
      source: { kind: 'token', assetId },
      location: 'token_details',
    });
  });
});
