import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import type { MySocialProfile } from '../hooks/useMyProfile';
import type { OverlayedMyProfileStats } from '../utils/overlayMyProfileLiveStats';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import MyProfileHeader from './MyProfileHeader';

jest.mock('../../../../UI/SocialFeed/components/TraderAvatar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

const PROFILE: MySocialProfile = {
  profileId: 'trader-1',
  displayName: 'Giga Whale',
  handle: 'giga-whale',
  imageUrl: null,
  xHandle: 'giga-whale',
  joinedAt: '2026-01-01T00:00:00.000Z',
};

const STATS: OverlayedMyProfileStats = {
  rankingTag: null,
  followerCount: 4,
  winRateLabel: '',
  isWinRatePositive: false,
  pnlLabel: '',
  hasPnl: false,
  isPnlPositive: false,
  performanceCells: [],
};

const renderHeader = (profile: MySocialProfile) =>
  renderWithProvider(
    <MyProfileHeader
      profile={profile}
      overlayedStats={STATS}
      followingCount={0}
      isOwner={false}
      onFollowersPress={jest.fn()}
      onFollowingPress={jest.fn()}
    />,
  );

describe('MyProfileHeader', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Narrow accessibility contract. Redux-driven badge updates are covered in
  // MyProfileView.view.test.tsx, not by supplying props here.
  it('exposes an accessible verified indicator without an X account', () => {
    renderHeader({ ...PROFILE, verified: true, xHandle: null });

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.VERIFIED_BADGE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.VERIFIED_BADGE),
    ).toHaveProp(
      'accessibilityLabel',
      strings('social_leaderboard.shell.filters.verification.verified'),
    );
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.VERIFIED_BADGE),
    ).toHaveProp('accessibilityRole', 'image');
  });

  it.each([false, undefined])(
    'omits the badge with verified=%s even when X is linked',
    (verified) => {
      renderHeader({ ...PROFILE, verified, connectedToX: true });

      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.VERIFIED_BADGE),
      ).not.toBeOnTheScreen();
    },
  );

  it('shows the X link before the joined date', () => {
    renderHeader(PROFILE);

    const xLink = screen.getByTestId(MyProfileViewSelectorsIDs.X_LINK);
    expect(xLink).toHaveTextContent(
      strings('social_leaderboard.my_profile.x_link'),
    );
    expect(
      within(xLink).queryByTestId(MyProfileViewSelectorsIDs.JOINED),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.JOINED),
    ).toBeOnTheScreen();

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.META_ROW),
    ).toHaveTextContent(/^X.*Joined/);
  });

  it('does not show an X link beside the display name', () => {
    renderHeader(PROFILE);

    expect(
      within(
        screen.getByTestId(MyProfileViewSelectorsIDs.DISPLAY_NAME),
      ).queryByTestId(MyProfileViewSelectorsIDs.X_LINK),
    ).not.toBeOnTheScreen();
    expect(
      screen.getAllByTestId(MyProfileViewSelectorsIDs.X_LINK),
    ).toHaveLength(1);
  });

  it('opens the X profile from the link', () => {
    renderHeader(PROFILE);

    fireEvent.press(screen.getByTestId(MyProfileViewSelectorsIDs.X_LINK));

    expect(Linking.openURL).toHaveBeenCalledWith('https://x.com/giga-whale');
  });

  it('shows only the joined date without an X account', () => {
    renderHeader({ ...PROFILE, xHandle: null });

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.X_LINK),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.JOINED),
    ).toBeOnTheScreen();
  });
});
