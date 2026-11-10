import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { SocialV1FeedAuthor } from '../types';
import { SocialFeedSurfaceProvider } from '../SocialFeedSurface';
import SocialTraderIdentityRow from './SocialTraderIdentityRow';
import { SocialTraderIdentityRowSelectorsIDs } from './SocialTraderIdentityRow.testIds';
import { X_TRUST_MARK_TEST_ID } from './XTrustMark';

jest.mock('./TraderAvatar', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      testID,
      imageUrl,
      address,
      profileId,
    }: {
      testID?: string;
      imageUrl?: string | null;
      address?: string;
      profileId?: string;
    }) => (
      <MockView
        testID={testID}
        imageUrl={imageUrl}
        address={address}
        profileId={profileId}
      />
    ),
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

  it('renders the handle and 30-day P&L without a verified badge or mock marker', () => {
    renderWithProvider(
      <SocialFeedSurfaceProvider showMockedFields>
        <SocialTraderIdentityRow
          author={dolphinAuthor()}
          handle="cented"
          imageUrl={null}
          timestampMs={Date.now()}
          recyclingKey="row-1"
          onMorePress={onMorePress}
        />
      </SocialFeedSurfaceProvider>,
    );

    expect(
      screen.getByTestId(SocialTraderIdentityRowSelectorsIDs.HANDLE),
    ).toHaveTextContent('cented');
    expect(
      screen.queryByTestId(SocialTraderIdentityRowSelectorsIDs.VERIFIED_BADGE),
    ).toBeNull();
    expect(
      screen.queryByTestId(SocialTraderIdentityRowSelectorsIDs.MOCK_MARKER),
    ).toBeNull();
    expect(screen.queryByText('*')).toBeNull();
    expect(
      screen.getByTestId(SocialTraderIdentityRowSelectorsIDs.TRADER_STAT),
    ).toHaveTextContent('$50K P&L (30d)');
  });

  it('leaves 12px between the avatar and the content column', () => {
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
      StyleSheet.flatten(
        screen.getByTestId(SocialTraderIdentityRowSelectorsIDs.CONTAINER).props
          .style,
      ),
    ).toEqual(expect.objectContaining({ gap: 12 }));
  });

  it('omits the invented verified badge when the surface has not opted in', () => {
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
      screen.queryByTestId(SocialTraderIdentityRowSelectorsIDs.VERIFIED_BADGE),
    ).toBeNull();
    expect(
      screen.queryByTestId(SocialTraderIdentityRowSelectorsIDs.MOCK_MARKER),
    ).toBeNull();
    expect(
      screen.getByTestId(SocialTraderIdentityRowSelectorsIDs.HANDLE),
    ).toHaveTextContent('cented');
  });

  it('renders the X mark when the author is connected to X', () => {
    renderWithProvider(
      <SocialTraderIdentityRow
        author={{ ...dolphinAuthor(), xHandle: 'DrrrCrypto' }}
        handle="cented"
        timestampMs={Date.now()}
        recyclingKey="row-x"
        onMorePress={onMorePress}
        onIdentityPress={jest.fn()}
        testIDs={{ identityPress: 'identity-press' }}
      />,
    );

    expect(screen.getByTestId(X_TRUST_MARK_TEST_ID)).toBeOnTheScreen();
  });

  it('omits the X mark when the author has no X handle', () => {
    renderWithProvider(
      <SocialTraderIdentityRow
        author={dolphinAuthor()}
        handle="cented"
        timestampMs={Date.now()}
        recyclingKey="row-no-x"
        onMorePress={onMorePress}
      />,
    );

    expect(screen.queryByTestId(X_TRUST_MARK_TEST_ID)).toBeNull();
  });

  it('omits the stat line when the trader has no stats', () => {
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

  it('passes the wallet address and profile id to the avatar', () => {
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
    expect(avatar.props.address).toBe(
      '0x1111111111111111111111111111111111111111',
    );
    expect(avatar.props.profileId).toBe('profile-alice');
    expect(avatar.props.imageUrl).toBeNull();
  });

  it('passes the profile id when the author has no wallet address', () => {
    renderWithProvider(
      <SocialTraderIdentityRow
        author={authorWithoutStats()}
        handle="ghost"
        imageUrl={null}
        timestampMs={Date.now()}
        recyclingKey="row-6"
        onMorePress={onMorePress}
      />,
    );

    const avatar = screen.getByTestId(
      SocialTraderIdentityRowSelectorsIDs.AVATAR,
    );
    expect(avatar.props.address).toBeUndefined();
    expect(avatar.props.profileId).toBe('profile-empty');
  });
});
