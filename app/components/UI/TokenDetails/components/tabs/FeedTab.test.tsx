import { render } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { View } from 'react-native';
import TokenDetailsFeedTab from './FeedTab';
import { SocialFeed, type SocialFeedProps } from '../../../SocialFeed';

jest.mock(
  '../../../../Views/SocialLeaderboard/hooks/useSocialFeedPostNavigation',
  () => ({
    useSocialFeedPostNavigation: () => ({
      onAuthorPress: jest.fn(),
      onPositionPress: jest.fn(),
    }),
  }),
);

jest.mock('../../../SocialFeed', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    SocialFeed: jest.fn(() => <MockView testID="social-feed" />),
    SocialEntryOptionsProvider: ({
      children,
    }: {
      children?: React.ReactNode;
    }) => children ?? null,
  };
});

const mockFeed = jest.mocked(SocialFeed);

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

const feedProps = (): SocialFeedProps => mockFeed.mock.calls[0][0];

describe('TokenDetailsFeedTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeed.mockImplementation(() => <View testID="social-feed" />);
  });

  it('shows the token on the shared social feed', () => {
    render(<TokenDetailsFeedTab assetId={assetId} />);

    expect(feedProps()).toEqual(
      expect.objectContaining({
        scope: 'all',
        chains: ['eip155:1'],
        assetIds: [assetId],
        location: 'token_details',
        onCopyTrade: undefined,
        isActive: undefined,
      }),
    );
  });

  it('asks for every trader on a native asset chain', () => {
    render(
      <TokenDetailsFeedTab assetId={'eip155:1/slip44:60' as CaipAssetType} />,
    );

    expect(feedProps()).toEqual(
      expect.objectContaining({
        scope: 'leaderboard',
        chains: ['eip155:1'],
      }),
    );
    expect(feedProps()).not.toHaveProperty('assetIds');
  });

  it('hands the copy-trade handler to the feed', () => {
    const onCopyTrade = jest.fn();

    render(<TokenDetailsFeedTab assetId={assetId} onCopyTrade={onCopyTrade} />);

    expect(feedProps().onCopyTrade).toBe(onCopyTrade);
  });
});
