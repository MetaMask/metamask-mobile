import React from 'react';
import { render } from '@testing-library/react-native';
import { SnapshotsTab } from './SnapshotsTab';
import { useSnapshots } from '../../../hooks/useSnapshots';
import { SnapshotTile } from '../../SnapshotTile';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import type { SnapshotDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('../../../hooks/useSnapshots', () => ({
  useSnapshots: jest.fn(),
}));

jest.mock('../../SnapshotTile', () => ({
  SnapshotTile: jest.fn(() => null),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  TextVariant: {
    BodyMd: 'BodyMd',
    BodySm: 'BodySm',
    HeadingMd: 'HeadingMd',
  },
  BoxFlexDirection: { Row: 'row' },
  BoxAlignItems: { Center: 'center' },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({ flexGrow: 1 })),
  }),
}));

jest.mock('../../../../../../component-library/components/Skeleton', () => ({
  Skeleton: 'Skeleton',
}));

jest.mock('../../RewardsErrorBanner', () => ({
  __esModule: true,
  default: function MockRewardsErrorBanner() {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(View, { testID: 'rewards-error-banner' });
  },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const createTestSnapshot = (
  overrides: Partial<SnapshotDto> = {},
): SnapshotDto => ({
  id: 'snapshot-1',
  seasonId: 'season-1',
  name: 'Test Airdrop',
  description: 'Test description',
  tokenSymbol: 'TEST',
  tokenAmount: '1000000000000000000000',
  tokenChainId: '1',
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
  receivingBlockchain: 'Ethereum',
  opensAt: '2025-03-01T00:00:00.000Z',
  closesAt: '2025-03-15T00:00:00.000Z',
  backgroundImage: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  ...overrides,
});

describe('SnapshotsTab', () => {
  const mockUseSnapshots = useSnapshots as jest.Mock;
  const mockSnapshotTile = SnapshotTile as jest.Mock;
  const mockFetchSnapshots = jest.fn();

  const defaultHookReturn = {
    categorizedSnapshots: {
      active: [],
      upcoming: [],
      previous: [],
    },
    isLoading: false,
    hasError: false,
    fetchSnapshots: mockFetchSnapshots,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSnapshots.mockReturnValue(defaultHookReturn);
  });

  it('renders loading skeleton when loading with no data', () => {
    mockUseSnapshots.mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
    });

    const { toJSON } = render(<SnapshotsTab />);
    const jsonString = JSON.stringify(toJSON());

    expect(jsonString).toContain('Skeleton');
  });

  it('renders error banner when error with no data', () => {
    mockUseSnapshots.mockReturnValue({
      ...defaultHookReturn,
      hasError: true,
    });

    const { getByTestId } = render(<SnapshotsTab />);

    expect(getByTestId('rewards-error-banner')).toBeOnTheScreen();
  });

  it('renders empty state when no snapshots exist', () => {
    mockUseSnapshots.mockReturnValue(defaultHookReturn);

    const { getByText } = render(<SnapshotsTab />);

    expect(getByText('rewards.snapshots_tab.empty_state')).toBeOnTheScreen();
  });

  it('renders active section when active snapshots exist', () => {
    const activeSnapshot = createTestSnapshot({ id: 'active-1' });

    mockUseSnapshots.mockReturnValue({
      ...defaultHookReturn,
      categorizedSnapshots: {
        active: [activeSnapshot],
        upcoming: [],
        previous: [],
      },
    });

    const { getByTestId, getByText } = render(<SnapshotsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.SNAPSHOTS_ACTIVE_SECTION),
    ).toBeOnTheScreen();
    expect(getByText('rewards.snapshots_tab.active_title')).toBeOnTheScreen();
    expect(mockSnapshotTile).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot: activeSnapshot }),
      expect.anything(),
    );
  });

  it('renders upcoming section when upcoming snapshots exist', () => {
    const upcomingSnapshot = createTestSnapshot({ id: 'upcoming-1' });

    mockUseSnapshots.mockReturnValue({
      ...defaultHookReturn,
      categorizedSnapshots: {
        active: [],
        upcoming: [upcomingSnapshot],
        previous: [],
      },
    });

    const { getByTestId, getByText } = render(<SnapshotsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.SNAPSHOTS_UPCOMING_SECTION),
    ).toBeOnTheScreen();
    expect(getByText('rewards.snapshots_tab.upcoming_title')).toBeOnTheScreen();
    expect(mockSnapshotTile).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot: upcomingSnapshot }),
      expect.anything(),
    );
  });

  it('renders previous section when previous snapshots exist', () => {
    const previousSnapshot = createTestSnapshot({ id: 'previous-1' });

    mockUseSnapshots.mockReturnValue({
      ...defaultHookReturn,
      categorizedSnapshots: {
        active: [],
        upcoming: [],
        previous: [previousSnapshot],
      },
    });

    const { getByTestId, getByText } = render(<SnapshotsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.SNAPSHOTS_PREVIOUS_SECTION),
    ).toBeOnTheScreen();
    expect(getByText('rewards.snapshots_tab.previous_title')).toBeOnTheScreen();
    expect(mockSnapshotTile).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot: previousSnapshot }),
      expect.anything(),
    );
  });

  it('renders refreshing indicator when loading with existing data', () => {
    const activeSnapshot = createTestSnapshot({ id: 'active-1' });

    mockUseSnapshots.mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
      categorizedSnapshots: {
        active: [activeSnapshot],
        upcoming: [],
        previous: [],
      },
    });

    const { getByText } = render(<SnapshotsTab />);

    expect(getByText('rewards.snapshots_tab.refreshing')).toBeOnTheScreen();
  });

  it('renders snapshots tab content container with correct testID', () => {
    mockUseSnapshots.mockReturnValue(defaultHookReturn);

    const { getByTestId } = render(<SnapshotsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_SNAPSHOTS),
    ).toBeOnTheScreen();
  });

  it('renders all sections when all snapshot categories have data', () => {
    const activeSnapshot = createTestSnapshot({ id: 'active-1' });
    const upcomingSnapshot = createTestSnapshot({ id: 'upcoming-1' });
    const previousSnapshot = createTestSnapshot({ id: 'previous-1' });

    mockUseSnapshots.mockReturnValue({
      ...defaultHookReturn,
      categorizedSnapshots: {
        active: [activeSnapshot],
        upcoming: [upcomingSnapshot],
        previous: [previousSnapshot],
      },
    });

    const { getByTestId } = render(<SnapshotsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.SNAPSHOTS_ACTIVE_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.SNAPSHOTS_UPCOMING_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.SNAPSHOTS_PREVIOUS_SECTION),
    ).toBeOnTheScreen();
    expect(mockSnapshotTile).toHaveBeenCalledTimes(3);
  });
});
