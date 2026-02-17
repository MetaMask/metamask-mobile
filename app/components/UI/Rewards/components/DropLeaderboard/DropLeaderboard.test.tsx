import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import DropLeaderboard from './DropLeaderboard';
import {
  DropLeaderboardDto,
  DropStatus,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  Button: 'Button',
  TextButton: 'TextButton',
  Icon: 'Icon',
  TextVariant: { BodyMd: 'BodyMd', BodySm: 'BodySm' },
  FontWeight: { Medium: 'Medium' },
  ButtonVariant: { Primary: 'Primary' },
  ButtonSize: { Lg: 'Lg' },
  IconName: { Star: 'Star' },
  IconColor: { WarningDefault: 'WarningDefault' },
  TextButtonSize: { BodySm: 'BodySm' },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../hooks/useDropCommittedAddress', () => ({
  useDropCommittedAddress: jest.fn(() => ({
    committedAddress: null,
    accountGroupInfo: null,
    isLoading: false,
  })),
}));

jest.mock('../RewardsErrorBanner', () => 'RewardsErrorBanner');

jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  () => 'AvatarAccount',
);

jest.mock('../../../../../component-library/components/Skeleton', () => ({
  Skeleton: 'Skeleton',
}));

const createMockLeaderboard = (
  overrides: Partial<DropLeaderboardDto> = {},
): DropLeaderboardDto => ({
  dropId: 'drop-1',
  userPosition: {
    rank: 5,
    points: 1000,
    identifier: '0x1234...5678',
  },
  top20: [
    { rank: 1, points: 5000, identifier: 'User 1' },
    { rank: 2, points: 4000, identifier: 'User 2' },
  ],
  totalParticipants: 100,
  totalPointsCommitted: 9000,
  ...overrides,
});

describe('DropLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(false);
  });

  it('renders skeleton when loading and no leaderboard data exists', () => {
    const { getByTestId } = render(
      <DropLeaderboard
        leaderboard={null}
        isLoading
        error={null}
        canCommit={false}
        dropStatus={DropStatus.OPEN}
      />,
    );

    expect(getByTestId('leaderboard-skeleton')).toBeOnTheScreen();
  });

  it('renders error banner when error exists', () => {
    const { getByTestId } = render(
      <DropLeaderboard
        leaderboard={null}
        isLoading={false}
        error="Failed to load leaderboard"
        canCommit={false}
        dropStatus={DropStatus.OPEN}
      />,
    );

    expect(getByTestId('leaderboard-error-banner')).toBeOnTheScreen();
  });

  it('returns null when no leaderboard data and not loading', () => {
    const { toJSON } = render(
      <DropLeaderboard
        leaderboard={null}
        isLoading={false}
        error={null}
        canCommit={false}
        dropStatus={DropStatus.OPEN}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders leaderboard with user position and entries', () => {
    const leaderboard = createMockLeaderboard();

    const { getByTestId } = render(
      <DropLeaderboard
        leaderboard={leaderboard}
        isLoading={false}
        error={null}
        canCommit={false}
        dropStatus={DropStatus.OPEN}
      />,
    );

    expect(getByTestId('drop-leaderboard')).toBeOnTheScreen();
    expect(getByTestId('leaderboard-user-position')).toBeOnTheScreen();
    expect(getByTestId('leaderboard-entries-list')).toBeOnTheScreen();
  });

  it('does not render user position when totalParticipants is 0', () => {
    const leaderboard = createMockLeaderboard({
      totalParticipants: 0,
      userPosition: {
        rank: 1,
        points: 100,
        identifier: '0x1234',
      },
    });

    const { queryByTestId } = render(
      <DropLeaderboard
        leaderboard={leaderboard}
        isLoading={false}
        error={null}
        canCommit={false}
        dropStatus={DropStatus.OPEN}
      />,
    );

    expect(queryByTestId('leaderboard-user-position')).toBeNull();
  });

  it('renders add more points button when canCommit and drop is open', () => {
    const leaderboard = createMockLeaderboard();

    const { getByTestId } = render(
      <DropLeaderboard
        leaderboard={leaderboard}
        isLoading={false}
        error={null}
        canCommit
        dropStatus={DropStatus.OPEN}
        onAddMorePoints={jest.fn()}
      />,
    );

    expect(getByTestId('leaderboard-add-more-points')).toBeOnTheScreen();
  });

  it('does not render add more points button when drop is closed', () => {
    const leaderboard = createMockLeaderboard();

    const { queryByTestId } = render(
      <DropLeaderboard
        leaderboard={leaderboard}
        isLoading={false}
        error={null}
        canCommit
        dropStatus={DropStatus.CLOSED}
      />,
    );

    expect(queryByTestId('leaderboard-add-more-points')).toBeNull();
  });
});
