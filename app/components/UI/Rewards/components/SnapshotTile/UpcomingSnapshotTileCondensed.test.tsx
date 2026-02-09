import React from 'react';
import { render } from '@testing-library/react-native';
import UpcomingSnapshotTileCondensed from './UpcomingSnapshotTileCondensed';
import type { SnapshotDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getSnapshotStatusInfo } from './SnapshotTile.utils';

// Mock design system
jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  BoxFlexDirection: { Column: 'Column', Row: 'Row' },
  BoxAlignItems: { Center: 'Center' },
  BoxJustifyContent: { Between: 'Between' },
  Text: 'Text',
  TextVariant: { BodySm: 'BodySm', BodyMd: 'BodyMd', HeadingLg: 'HeadingLg' },
  Icon: 'Icon',
  IconSize: { Sm: 'Sm' },
  IconName: { Clock: 'Clock', Speed: 'Speed' },
}));

// Mock Tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

// Mock the utils to control status output
jest.mock('./SnapshotTile.utils', () => ({
  getSnapshotStatusInfo: jest.fn(),
}));

const mockGetSnapshotStatusInfo = getSnapshotStatusInfo as jest.MockedFunction<
  typeof getSnapshotStatusInfo
>;

/**
 * Creates a test snapshot with default values that can be overridden
 */
function createTestSnapshot(overrides: Partial<SnapshotDto> = {}): SnapshotDto {
  return {
    id: 'snapshot-1',
    seasonId: 'season-1',
    name: 'Test Snapshot Prize',
    description: 'Test description',
    tokenSymbol: 'TEST',
    tokenAmount: '1000',
    tokenChainId: '1',
    receivingBlockchain: 'ethereum',
    opensAt: '2024-01-01T00:00:00Z',
    closesAt: '2024-01-31T23:59:59Z',
    calculatedAt: undefined,
    distributedAt: undefined,
    backgroundImage: {
      lightModeUrl: 'https://example.com/light.png',
      darkModeUrl: 'https://example.com/dark.png',
    },
    ...overrides,
  };
}

describe('UpcomingSnapshotTileCondensed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders snapshot name when status is upcoming', () => {
    const snapshot = createTestSnapshot({ name: 'Upcoming Airdrop' });
    mockGetSnapshotStatusInfo.mockReturnValue({
      status: 'upcoming',
      statusLabel: 'Up Next',
      statusDescription: 'Starts Mar 1, 12:00 PM',
      statusDescriptionIcon: 'Speed' as never,
    });

    const { getByText } = render(
      <UpcomingSnapshotTileCondensed snapshot={snapshot} />,
    );

    expect(getByText('Upcoming Airdrop')).toBeOnTheScreen();
  });

  it('renders status description when status is upcoming', () => {
    const snapshot = createTestSnapshot();
    mockGetSnapshotStatusInfo.mockReturnValue({
      status: 'upcoming',
      statusLabel: 'Up Next',
      statusDescription: 'Starts Mar 1, 12:00 PM',
      statusDescriptionIcon: 'Speed' as never,
    });

    const { getByText } = render(
      <UpcomingSnapshotTileCondensed snapshot={snapshot} />,
    );

    expect(getByText('Starts Mar 1, 12:00 PM')).toBeOnTheScreen();
  });

  it('returns null when status is not upcoming', () => {
    const snapshot = createTestSnapshot();
    mockGetSnapshotStatusInfo.mockReturnValue({
      status: 'live',
      statusLabel: 'Live Now',
      statusDescription: 'Ends Mar 15, 2:30 PM',
      statusDescriptionIcon: 'Clock' as never,
    });

    const { toJSON } = render(
      <UpcomingSnapshotTileCondensed snapshot={snapshot} />,
    );

    expect(toJSON()).toBeNull();
  });
});
