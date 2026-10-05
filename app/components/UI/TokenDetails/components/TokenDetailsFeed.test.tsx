import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import TokenDetailsFeed from './TokenDetailsFeed';

jest.mock('../../SocialFeed/components/SocialFeed', () => {
  const ReactLib = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      source,
      location,
    }: {
      source: { kind: string; assetId: string };
      location: string;
    }) =>
      ReactLib.createElement(
        Text,
        { testID: 'social-feed' },
        `${source.kind}:${source.assetId}:${location}`,
      ),
  };
});

const assetId = 'eip155:1/slip44:60' as const;

describe('TokenDetailsFeed', () => {
  it('renders the drop-in social feed for the token', () => {
    render(<TokenDetailsFeed assetId={assetId} />);

    expect(
      screen.getByTestId(TokenOverviewSelectorsIDs.FEED),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('social-feed')).toHaveTextContent(
      'token:eip155:1/slip44:60:token_details',
    );
  });

  it('renders nothing when the asset has no CAIP-19 id', () => {
    render(<TokenDetailsFeed assetId={null} />);

    expect(screen.queryByTestId(TokenOverviewSelectorsIDs.FEED)).toBeNull();
    expect(screen.queryByTestId('social-feed')).toBeNull();
  });
});
