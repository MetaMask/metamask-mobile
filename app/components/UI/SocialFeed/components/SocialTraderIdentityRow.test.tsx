import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { SocialV1FeedAuthor } from '../types';
import SocialTraderIdentityRow from './SocialTraderIdentityRow';
import { SocialTraderIdentityRowSelectorsIDs } from './SocialTraderIdentityRow.testIds';

jest.mock('./TraderAvatar', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      testID,
      imageUrl,
      address,
    }: {
      testID?: string;
      imageUrl?: string | null;
      address?: string;
    }) => <MockView testID={testID} imageUrl={imageUrl} address={address} />,
  };
});

const dolphinAuthor = (): SocialV1FeedAuthor => ({
  id: 'profile-alice',
  username: 'cented',
  address: '0x1111111111111111111111111111111111111111',
  avatarUri: null,
  winRatePercent: 56,
  pnl30d: 50_000,
  followerCount: 1_200,
});

const authorWithoutStats = (): SocialV1FeedAuthor => ({
  id: 'profile-empty',
  username: 'ghost',
  winRatePercent: null,
  pnl30d: null,
  followerCount: null,
});

describe('SocialTraderIdentityRow', () => {
  const onMorePress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the handle, invented verified badge, cohort, and 30-day P&L', () => {
    renderWithProvider(
      <SocialTraderIdentityRow
        author={dolphinAuthor()}
        handle="cented"
        imageUrl={null}
        timestampMs={Date.now()}
        recyclingKey="row-1"
        onMorePress={onMorePress}
      />,
    );

    expect(
      screen.getByTestId(SocialTraderIdentityRowSelectorsIDs.HANDLE),
    ).toHaveTextContent('cented');
    expect(
      screen.getByTestId(SocialTraderIdentityRowSelectorsIDs.VERIFIED_BADGE),
    ).toBeOnTheScreen();
    expect(screen.getByText('*')).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialTraderIdentityRowSelectorsIDs.COHORT),
    ).toHaveTextContent('🐬');
    expect(
      screen.getByTestId(SocialTraderIdentityRowSelectorsIDs.TRADER_STAT),
    ).toHaveTextContent('$50K P&L (30d)');
  });

  it('omits the stat line and cohort when the trader has no stats', () => {
    renderWithProvider(
      <SocialTraderIdentityRow
        author={authorWithoutStats()}
        handle="ghost"
        timestampMs={Date.now()}
        recyclingKey="row-2"
        onMorePress={onMorePress}
      />,
    );

    expect(
      screen.queryByTestId(SocialTraderIdentityRowSelectorsIDs.TRADER_STAT),
    ).toBeNull();
    expect(
      screen.queryByTestId(SocialTraderIdentityRowSelectorsIDs.COHORT),
    ).toBeNull();
  });

  it('calls onMorePress from the overflow button', () => {
    renderWithProvider(
      <SocialTraderIdentityRow
        author={dolphinAuthor()}
        handle="cented"
        timestampMs={Date.now()}
        recyclingKey="row-3"
        onMorePress={onMorePress}
      />,
    );

    fireEvent.press(
      screen.getByTestId(SocialTraderIdentityRowSelectorsIDs.MORE),
    );

    expect(onMorePress).toHaveBeenCalledTimes(1);
  });

  it('calls onIdentityPress when the identity is pressed', () => {
    const onIdentityPress = jest.fn();

    renderWithProvider(
      <SocialTraderIdentityRow
        author={dolphinAuthor()}
        handle="cented"
        timestampMs={Date.now()}
        recyclingKey="row-4"
        onMorePress={onMorePress}
        onIdentityPress={onIdentityPress}
        testIDs={{ identityPress: 'identity-press' }}
      />,
    );

    fireEvent.press(screen.getByTestId('identity-press'));

    expect(onIdentityPress).toHaveBeenCalledTimes(1);
  });

  it('passes the profile id to the avatar', () => {
    renderWithProvider(
      <SocialTraderIdentityRow
        author={dolphinAuthor()}
        handle="cented"
        imageUrl={null}
        timestampMs={Date.now()}
        recyclingKey="row-5"
        onMorePress={onMorePress}
      />,
    );

    const avatar = screen.getByTestId(
      SocialTraderIdentityRowSelectorsIDs.AVATAR,
    );
    expect(avatar.props.address).toBe('profile-alice');
    expect(avatar.props.imageUrl).toBeNull();
  });
});
