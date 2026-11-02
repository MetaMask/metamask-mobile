import { render, screen } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';
import TokenDetailsFeedTab from './FeedTab';
import { TokenDetailsFeed } from './TokenDetailsFeed';

jest.mock('./TokenDetailsFeed', () => ({
  TokenDetailsFeed: jest.fn(() => null),
}));

const mockFeed = jest.mocked(TokenDetailsFeed);

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

describe('TokenDetailsFeedTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeed.mockImplementation(() => <View testID="social-feed" />);
  });

  it('shows the token social feed without a heading', () => {
    render(<TokenDetailsFeedTab assetId={assetId} />);

    expect(screen.getByTestId('social-feed')).toBeOnTheScreen();
    expect(mockFeed.mock.calls[0][0]).toEqual({
      source: { kind: 'token', assetId },
      location: 'token_details',
    });
  });

  it('hands the copy-trade handler to the feed', () => {
    const onCopyTrade = jest.fn();

    render(<TokenDetailsFeedTab assetId={assetId} onCopyTrade={onCopyTrade} />);

    expect(mockFeed.mock.calls[0][0].onCopyTrade).toBe(onCopyTrade);
  });
});
