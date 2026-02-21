import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import UpcomingDropTileCondensed from './UpcomingDropTileCondensed';
import {
  DropStatus,
  SeasonDropDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  TextVariant: { BodyMd: 'BodyMd', BodySm: 'BodySm' },
  IconName: {
    Clock: 'Clock',
    Speed: 'Speed',
    Loading: 'Loading',
    Confirmation: 'Confirmation',
    Send: 'Send',
  },
  BoxFlexDirection: { Row: 'Row', Column: 'Column' },
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const createMockDrop = (
  overrides: Partial<SeasonDropDto> = {},
): SeasonDropDto =>
  ({
    id: 'drop-1',
    name: 'Upcoming Drop',
    seasonId: 'season-1',
    tokenSymbol: 'MON',
    tokenAmount: '50000',
    tokenChainId: '1',
    receivingBlockchain: 1,
    opensAt: '2025-04-01T00:00:00Z',
    closesAt: '2025-04-15T00:00:00Z',
    image: { lightModeUrl: 'light.png', darkModeUrl: 'dark.png' },
    status: DropStatus.UPCOMING,
    ...overrides,
  }) as SeasonDropDto;

describe('UpcomingDropTileCondensed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders for upcoming drops', () => {
    const drop = createMockDrop();
    const { toJSON } = render(<UpcomingDropTileCondensed drop={drop} />);

    expect(toJSON()).not.toBeNull();
  });

  it('returns null for non-upcoming drops', () => {
    const drop = createMockDrop({ status: DropStatus.OPEN });
    const { toJSON } = render(<UpcomingDropTileCondensed drop={drop} />);

    expect(toJSON()).toBeNull();
  });

  it('returns null for closed drops', () => {
    const drop = createMockDrop({ status: DropStatus.CLOSED });
    const { toJSON } = render(<UpcomingDropTileCondensed drop={drop} />);

    expect(toJSON()).toBeNull();
  });

  it('navigates to drop detail on press', () => {
    const drop = createMockDrop();
    const { root } = render(<UpcomingDropTileCondensed drop={drop} />);

    fireEvent.press(root);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DROP_DETAIL, {
      dropId: 'drop-1',
    });
  });
});
