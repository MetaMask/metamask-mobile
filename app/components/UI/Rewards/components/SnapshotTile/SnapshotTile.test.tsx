import React from 'react';
import { render } from '@testing-library/react-native';
import SnapshotTile from './SnapshotTile';
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

// Mock RewardsThemeImageComponent
jest.mock('../ThemeImageComponent', () => ({
  __esModule: true,
  default: 'RewardsThemeImageComponent',
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

describe('SnapshotTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSnapshotStatusInfo.mockReturnValue({
      status: 'live',
      statusLabel: 'Live Now',
      statusDescription: 'Ends Mar 15, 2:30 PM',
      statusDescriptionIcon: 'Clock' as never,
    });
  });

  it('renders snapshot name as prize display', () => {
    const snapshot = createTestSnapshot({ name: 'Monad Airdrop' });

    const { getByText } = render(<SnapshotTile snapshot={snapshot} />);

    expect(getByText('Monad Airdrop')).toBeOnTheScreen();
  });

  it('renders status description text', () => {
    const snapshot = createTestSnapshot();
    mockGetSnapshotStatusInfo.mockReturnValue({
      status: 'live',
      statusLabel: 'Live Now',
      statusDescription: 'Ends Mar 15, 2:30 PM',
      statusDescriptionIcon: 'Clock' as never,
    });

    const { getByText } = render(<SnapshotTile snapshot={snapshot} />);

    expect(getByText('Ends Mar 15, 2:30 PM')).toBeOnTheScreen();
  });

  it('renders status label text', () => {
    const snapshot = createTestSnapshot();
    mockGetSnapshotStatusInfo.mockReturnValue({
      status: 'live',
      statusLabel: 'Live Now',
      statusDescription: 'Ends Mar 15, 2:30 PM',
      statusDescriptionIcon: 'Clock' as never,
    });

    const { getByText } = render(<SnapshotTile snapshot={snapshot} />);

    expect(getByText('Live Now')).toBeOnTheScreen();
  });

  it('displays ActivityIndicator when status is calculating', () => {
    const snapshot = createTestSnapshot();
    mockGetSnapshotStatusInfo.mockReturnValue({
      status: 'calculating',
      statusLabel: 'Calculating',
      statusDescription: 'Results coming soon',
      statusDescriptionIcon: 'Loading' as never,
    });

    const { UNSAFE_getByType } = render(<SnapshotTile snapshot={snapshot} />);
    const { ActivityIndicator } = jest.requireActual('react-native');

    expect(UNSAFE_getByType(ActivityIndicator)).toBeDefined();
  });

  it('displays Icon when status is not calculating', () => {
    const snapshot = createTestSnapshot();
    mockGetSnapshotStatusInfo.mockReturnValue({
      status: 'live',
      statusLabel: 'Live Now',
      statusDescription: 'Ends Mar 15, 2:30 PM',
      statusDescriptionIcon: 'Clock' as never,
    });

    const { UNSAFE_queryByType, UNSAFE_getByType } = render(
      <SnapshotTile snapshot={snapshot} />,
    );
    const { ActivityIndicator } = jest.requireActual('react-native');

    expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    expect(UNSAFE_getByType('Icon' as never)).toBeDefined();
  });

  it('renders background image component', () => {
    const snapshot = createTestSnapshot({
      backgroundImage: {
        lightModeUrl: 'https://example.com/custom-light.png',
        darkModeUrl: 'https://example.com/custom-dark.png',
      },
    });

    const { UNSAFE_getByType } = render(<SnapshotTile snapshot={snapshot} />);

    expect(
      UNSAFE_getByType('RewardsThemeImageComponent' as never),
    ).toBeDefined();
  });
});
