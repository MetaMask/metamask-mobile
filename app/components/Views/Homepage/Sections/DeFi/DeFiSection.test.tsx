import React, { createRef } from 'react';
import { screen, act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import DeFiSection from './DeFiSection';
import { SectionRefreshHandle } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockExecutePoll = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    DeFiPositionsController: {
      _executePoll: (...args: unknown[]) => mockExecutePoll(...args),
    },
  },
}));

jest.mock(
  '../../../../../selectors/featureFlagController/assetsDefiPositions',
  () => ({
    selectAssetsDefiPositionsEnabled: jest.fn(() => true),
  }),
);

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(() => false),
}));

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(),
  HomeSectionNames: {
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
  },
}));

const mockUseDeFiPositionsForHomepage = jest.fn();

jest.mock('./hooks', () => ({
  useDeFiPositionsForHomepage: (...args: unknown[]) =>
    mockUseDeFiPositionsForHomepage(...args),
  DeFiPositionEntry: {},
}));

jest.mock('../../../../UI/DefiEmptyState', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const MockDefiEmptyState = ({ onAction }: { onAction?: () => void }) =>
    ReactActual.createElement(
      View,
      { testID: 'defi-empty-state' },
      ReactActual.createElement(Text, null, 'Lend, borrow, and trade'),
      ReactActual.createElement(
        TouchableOpacity,
        { onPress: onAction },
        ReactActual.createElement(Text, null, 'Explore DeFi'),
      ),
    );
  MockDefiEmptyState.displayName = 'DefiEmptyState';
  return { DefiEmptyState: MockDefiEmptyState };
});

// Mock DeFiPositionsListItem to avoid deep import chain issues
jest.mock('../../../../UI/DeFiPositions/DeFiPositionsListItem', () => {
  const { Text } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const MockComponent = ({
    protocolAggregate,
  }: {
    protocolAggregate: { protocolDetails: { name: string } };
  }) =>
    ReactActual.createElement(
      Text,
      null,
      protocolAggregate.protocolDetails.name,
    );
  MockComponent.displayName = 'DeFiPositionsListItem';
  return MockComponent;
});

const createMockPosition = (name: string) => ({
  chainId: '0x1',
  protocolId: name.toLowerCase(),
  protocolAggregate: {
    protocolDetails: {
      name,
      iconUrl: `https://example.com/${name}.png`,
    },
    aggregatedMarketValue: 1000,
    positionTypes: {},
  },
});

describe('DeFiSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return values to defaults
    jest
      .requireMock(
        '../../../../../selectors/featureFlagController/assetsDefiPositions',
      )
      .selectAssetsDefiPositionsEnabled.mockReturnValue(true);

    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      hasError: false,
      isEmpty: true,
    });
  });

  it('renders section title when enabled with positions', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [createMockPosition('Aave')],
      isLoading: false,
      hasError: false,
      isEmpty: false,
    });

    renderWithProvider(
      <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('DeFi')).toBeOnTheScreen();
  });

  it('returns null when DeFi is disabled', () => {
    jest
      .requireMock(
        '../../../../../selectors/featureFlagController/assetsDefiPositions',
      )
      .selectAssetsDefiPositionsEnabled.mockReturnValue(false);

    const { toJSON } = renderWithProvider(
      <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders empty state when positions are empty and not loading', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      hasError: false,
      isEmpty: true,
    });

    renderWithProvider(
      <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('defi-empty-state')).toBeOnTheScreen();
    expect(screen.getByText('DeFi')).toBeOnTheScreen();
  });

  it('renders error state with retry when there is an error and not loading', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      hasError: true,
      isEmpty: false,
    });

    renderWithProvider(
      <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('DeFi')).toBeOnTheScreen();
    expect(screen.getByText(/unable to load/i)).toBeOnTheScreen();
    expect(screen.getByText(/retry/i)).toBeOnTheScreen();
  });

  it('calls _executePoll on retry button press', async () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      hasError: true,
      isEmpty: false,
    });

    renderWithProvider(
      <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText(/retry/i));
    });

    expect(mockExecutePoll).toHaveBeenCalled();
  });

  it('renders skeleton when loading', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: true,
      hasError: false,
      isEmpty: false,
    });

    renderWithProvider(
      <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('DeFi')).toBeOnTheScreen();
    // Skeleton renders 3 placeholder items
  });

  it('renders DeFi positions list items', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [createMockPosition('Aave'), createMockPosition('Uniswap')],
      isLoading: false,
      hasError: false,
      isEmpty: false,
    });

    renderWithProvider(
      <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Aave')).toBeOnTheScreen();
    expect(screen.getByText('Uniswap')).toBeOnTheScreen();
  });

  it('navigates to DeFi full view when title is pressed', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [createMockPosition('Aave')],
      isLoading: false,
      hasError: false,
      isEmpty: false,
    });

    renderWithProvider(
      <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByText('DeFi'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.DEFI_FULL_VIEW);
  });

  it('exposes refresh function via ref', async () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [createMockPosition('Aave')],
      isLoading: false,
      hasError: false,
      isEmpty: false,
    });

    const ref = createRef<SectionRefreshHandle>();

    renderWithProvider(
      <DeFiSection ref={ref} sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.refresh).toBe('function');

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockExecutePoll).toHaveBeenCalled();
  });
});
