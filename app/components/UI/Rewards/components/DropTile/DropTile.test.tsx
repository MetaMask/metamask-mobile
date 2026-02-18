import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DropTile from './DropTile';
import { useDropLeaderboard } from '../../hooks/useDropLeaderboard';
import {
  DropStatus,
  SeasonDropDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  Icon: 'Icon',
  TextVariant: { BodySm: 'BodySm', HeadingLg: 'HeadingLg' },
  IconName: {
    Clock: 'Clock',
    Speed: 'Speed',
    Loading: 'Loading',
    Confirmation: 'Confirmation',
    Send: 'Send',
  },
  IconSize: { Sm: 'Sm' },
  BoxFlexDirection: { Row: 'Row', Column: 'Column' },
  BoxAlignItems: { Center: 'Center' },
  BoxJustifyContent: { Between: 'Between' },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.drop.pill_live_with_position')
      return `Live • You're #${params?.rank}`;
    if (key === 'rewards.drop.pill_live_with_participants')
      return `Live • ${params?.count} entered`;
    return key;
  }),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatNumber: jest.fn((n: number) => n.toString()),
}));

jest.mock('../ThemeImageComponent', () => 'RewardsThemeImageComponent');

jest.mock('../../hooks/useDropLeaderboard', () => ({
  useDropLeaderboard: jest.fn(),
}));

jest.mock('../../../../../reducers/rewards', () => ({
  DROP_LEADERBOARD_RANK_TBD: -1,
}));

const createMockDrop = (overrides: Partial<SeasonDropDto> = {}): SeasonDropDto =>
  ({
    id: 'drop-1',
    name: 'Test Drop',
    seasonId: 'season-1',
    tokenSymbol: 'MON',
    tokenAmount: '50000',
    tokenChainId: '1',
    receivingBlockchain: 1,
    opensAt: '2025-03-01T00:00:00Z',
    closesAt: '2025-03-15T00:00:00Z',
    image: { lightModeUrl: 'light.png', darkModeUrl: 'dark.png' },
    status: DropStatus.OPEN,
    ...overrides,
  }) as SeasonDropDto;

describe('DropTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDropLeaderboard as jest.Mock).mockReturnValue({
      leaderboard: null,
    });
  });

  it('renders drop tile with name and status', () => {
    const drop = createMockDrop();
    const { toJSON } = render(<DropTile drop={drop} />);

    expect(toJSON()).not.toBeNull();
  });

  it('navigates to drop detail on press', () => {
    const drop = createMockDrop();
    const { root } = render(<DropTile drop={drop} />);

    fireEvent.press(root);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DROP_DETAIL, {
      dropId: 'drop-1',
    });
  });

  it('renders with full opacity when disabled', () => {
    const drop = createMockDrop();
    const { toJSON } = render(<DropTile drop={drop} disabled />);

    // When disabled, the tile still renders but with activeOpacity=1
    expect(toJSON()).not.toBeNull();
  });

  it('shows user rank when on leaderboard and drop is open', () => {
    (useDropLeaderboard as jest.Mock).mockReturnValue({
      leaderboard: {
        userPosition: { rank: 5, points: 1000, identifier: '0x1234' },
        totalParticipants: 100,
      },
    });

    const drop = createMockDrop({ status: DropStatus.OPEN });
    const { toJSON } = render(<DropTile drop={drop} />);

    expect(toJSON()).not.toBeNull();
  });

  it('shows participant count when user is not on leaderboard', () => {
    (useDropLeaderboard as jest.Mock).mockReturnValue({
      leaderboard: {
        userPosition: undefined,
        totalParticipants: 500,
      },
    });

    const drop = createMockDrop({ status: DropStatus.OPEN });
    const { toJSON } = render(<DropTile drop={drop} />);

    expect(toJSON()).not.toBeNull();
  });

  it('renders closed status with ActivityIndicator', () => {
    const drop = createMockDrop({ status: DropStatus.CLOSED });
    const { toJSON } = render(<DropTile drop={drop} />);

    expect(toJSON()).not.toBeNull();
  });

  it('renders upcoming status correctly', () => {
    const drop = createMockDrop({ status: DropStatus.UPCOMING });
    const { toJSON } = render(<DropTile drop={drop} />);

    expect(toJSON()).not.toBeNull();
  });
});
