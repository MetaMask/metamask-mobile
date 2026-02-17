import React from 'react';
import { render } from '@testing-library/react-native';
import { DropsTab } from './DropsTab';
import { useSeasonDrops } from '../../../hooks/useSeasonDrops';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import {
  DropStatus,
  type SeasonDropDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('../../../hooks/useSeasonDrops', () => ({
  useSeasonDrops: jest.fn(),
}));

jest.mock('../../DropTile/DropTile', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./DropsGroup', () => ({
  __esModule: true,
  default: jest.fn(({ title, drops, testID }) => {
    const ReactNative = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    if (drops.length === 0) return null;
    return ReactActual.createElement(
      ReactNative.View,
      { testID },
      ReactActual.createElement(ReactNative.Text, null, title),
      drops.map((drop: SeasonDropDto) =>
        ReactActual.createElement(ReactNative.View, {
          key: drop.id,
          testID: `drop-tile-${drop.id}`,
        }),
      ),
    );
  }),
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

const createTestDrop = (
  overrides: Partial<SeasonDropDto> = {},
): SeasonDropDto => ({
  id: 'drop-1',
  seasonId: 'season-1',
  name: 'Test Airdrop',
  description: 'Test description',
  tokenSymbol: 'TEST',
  tokenAmount: '1000000000000000000000',
  tokenChainId: '1',
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
  receivingBlockchain: 1,
  opensAt: '2025-03-01T00:00:00.000Z',
  closesAt: '2025-03-15T00:00:00.000Z',
  image: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  status: DropStatus.OPEN,
  ...overrides,
});

describe('DropsTab', () => {
  const mockUseSeasonDrops = useSeasonDrops as jest.Mock;
  const mockFetchDrops = jest.fn();

  const defaultHookReturn = {
    categorizedDrops: {
      active: [],
      upcoming: [],
      previous: [],
    },
    isLoading: false,
    hasError: false,
    fetchDrops: mockFetchDrops,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSeasonDrops.mockReturnValue(defaultHookReturn);
  });

  it('renders loading skeleton when loading with no data', () => {
    mockUseSeasonDrops.mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
    });

    const { toJSON } = render(<DropsTab />);
    const jsonString = JSON.stringify(toJSON());

    expect(jsonString).toContain('Skeleton');
  });

  it('renders error banner when error with no data', () => {
    mockUseSeasonDrops.mockReturnValue({
      ...defaultHookReturn,
      hasError: true,
    });

    const { getByTestId } = render(<DropsTab />);

    expect(getByTestId('rewards-error-banner')).toBeOnTheScreen();
  });

  it('renders empty state when no drops exist', () => {
    mockUseSeasonDrops.mockReturnValue(defaultHookReturn);

    const { getByText } = render(<DropsTab />);

    expect(getByText('rewards.drop_tab.empty_state')).toBeOnTheScreen();
  });

  it('renders active section when active drops exist', () => {
    const activeDrop = createTestDrop({
      id: 'active-1',
      status: DropStatus.OPEN,
    });

    mockUseSeasonDrops.mockReturnValue({
      ...defaultHookReturn,
      categorizedDrops: {
        active: [activeDrop],
        upcoming: [],
        previous: [],
      },
    });

    const { getByTestId, getByText } = render(<DropsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.DROPS_ACTIVE_SECTION),
    ).toBeOnTheScreen();
    expect(getByText('rewards.drop_tab.active_title')).toBeOnTheScreen();
  });

  it('renders upcoming section when upcoming drops exist', () => {
    const upcomingDrop = createTestDrop({
      id: 'upcoming-1',
      status: DropStatus.UPCOMING,
    });

    mockUseSeasonDrops.mockReturnValue({
      ...defaultHookReturn,
      categorizedDrops: {
        active: [],
        upcoming: [upcomingDrop],
        previous: [],
      },
    });

    const { getByTestId, getByText } = render(<DropsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.DROPS_UPCOMING_SECTION),
    ).toBeOnTheScreen();
    expect(getByText('rewards.drop_tab.upcoming_title')).toBeOnTheScreen();
  });

  it('renders previous section when previous drops exist', () => {
    const previousDrop = createTestDrop({
      id: 'previous-1',
      status: DropStatus.CLOSED,
    });

    mockUseSeasonDrops.mockReturnValue({
      ...defaultHookReturn,
      categorizedDrops: {
        active: [],
        upcoming: [],
        previous: [previousDrop],
      },
    });

    const { getByTestId, getByText } = render(<DropsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.DROPS_PREVIOUS_SECTION),
    ).toBeOnTheScreen();
    expect(getByText('rewards.drop_tab.previous_title')).toBeOnTheScreen();
  });

  it('renders refreshing indicator when loading with existing data', () => {
    const activeDrop = createTestDrop({
      id: 'active-1',
      status: DropStatus.OPEN,
    });

    mockUseSeasonDrops.mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
      categorizedDrops: {
        active: [activeDrop],
        upcoming: [],
        previous: [],
      },
    });

    const { getByText } = render(<DropsTab />);

    expect(getByText('rewards.drop_tab.refreshing')).toBeOnTheScreen();
  });

  it('renders drops tab content container with correct testID', () => {
    mockUseSeasonDrops.mockReturnValue(defaultHookReturn);

    const { getByTestId } = render(<DropsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTENT_DROPS),
    ).toBeOnTheScreen();
  });

  it('renders all sections when all drop categories have data', () => {
    const activeDrop = createTestDrop({
      id: 'active-1',
      status: DropStatus.OPEN,
    });
    const upcomingDrop = createTestDrop({
      id: 'upcoming-1',
      status: DropStatus.UPCOMING,
    });
    const previousDrop = createTestDrop({
      id: 'previous-1',
      status: DropStatus.CLOSED,
    });

    mockUseSeasonDrops.mockReturnValue({
      ...defaultHookReturn,
      categorizedDrops: {
        active: [activeDrop],
        upcoming: [upcomingDrop],
        previous: [previousDrop],
      },
    });

    const { getByTestId } = render(<DropsTab />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.DROPS_ACTIVE_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.DROPS_UPCOMING_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.DROPS_PREVIOUS_SECTION),
    ).toBeOnTheScreen();
  });
});
