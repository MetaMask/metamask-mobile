import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import {
  getConnectionFollowButtonTestId,
  getConnectionRowTestId,
} from '../../FollowConnectionsView/FollowConnectionsView.testIds';
import type { UsePopularTradersResult } from '../../SocialV1View/feed/hooks/usePopularTraders';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import type { TopTrader } from '../../../Homepage/Sections/TopTraders/types';
/* eslint-enable import-x/no-restricted-paths */
import FollowingSuggestions, {
  FOLLOWING_SUGGESTIONS_TEST_ID,
} from './FollowingSuggestions';

const mockNavigate = jest.fn();
const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
const mockFollowWithSetup = jest.fn(
  async (_isFollowing: boolean, performFollow: () => Promise<void>) => {
    await performFollow();
  },
);

jest.mock('../../terms/socialTermsAcceptance');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../hooks/useFollowWithNotificationSetup', () => ({
  useFollowWithNotificationSetup: () => ({
    followWithSetup: mockFollowWithSetup,
  }),
}));

const mockTrader: TopTrader = {
  id: 'trader-1',
  address: '0x0000000000000000000000000000000000000001',
  rank: 1,
  overallRank: 1,
  username: 'Pain',
  percentageChange: 96.2,
  pnlValue: 963000,
  winRatePercent: 92,
  pnlPerChain: { base: 963000 },
  followerCount: 65700,
  isFollowing: false,
};

const mockUsePopularTraders = jest.fn<UsePopularTradersResult, []>();

jest.mock('../../SocialV1View/feed/hooks/usePopularTraders', () => ({
  usePopularTraders: () => mockUsePopularTraders(),
}));

const backgroundColor = (testID: string) => {
  const style = screen.getByTestId(testID).props.style;
  const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
  return flat?.backgroundColor;
};

describe('FollowingSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePopularTraders.mockReturnValue({
      traders: [mockTrader],
      isLoading: false,
      isFetching: false,
      hasFetched: true,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
      toggleFollow: mockToggleFollow,
    });
  });

  it('lists a suggested trader under the section copy with a secondary Follow button', () => {
    renderWithProvider(
      <>
        <FollowingSuggestions />
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          testID="secondary-reference"
        >
          Follow
        </Button>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Md}
          testID="primary-reference"
        >
          Follow
        </Button>
      </>,
    );

    expect(screen.getByTestId(FOLLOWING_SUGGESTIONS_TEST_ID)).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('social_leaderboard.feed.v1_empty.following_suggestions.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings(
          'social_leaderboard.feed.v1_empty.following_suggestions.description',
        ),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('65.7K followers')).toBeOnTheScreen();
    expect(backgroundColor(getConnectionFollowButtonTestId('trader-1'))).toBe(
      backgroundColor('secondary-reference'),
    );
    expect(
      backgroundColor(getConnectionFollowButtonTestId('trader-1')),
    ).not.toBe(backgroundColor('primary-reference'));
  });

  it('opens the trader profile from a row tap', () => {
    renderWithProvider(<FollowingSuggestions />);

    fireEvent.press(screen.getByTestId(getConnectionRowTestId('trader-1')));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      {
        traderId: 'trader-1',
        traderName: 'Pain',
        traderAddress: mockTrader.address,
        source: 'profiles_to_follow',
        traderRank: 1,
      },
      {},
    );
  });

  it('follows from the row button', () => {
    renderWithProvider(<FollowingSuggestions />);

    fireEvent.press(
      screen.getByTestId(getConnectionFollowButtonTestId('trader-1')),
    );

    expect(mockToggleFollow).toHaveBeenCalledWith('trader-1', {
      source: 'profiles_to_follow',
      traderAddress: mockTrader.address,
      traderUsername: 'Pain',
      traderRank: 1,
      traderAvatarUri: undefined,
    });
  });
});
