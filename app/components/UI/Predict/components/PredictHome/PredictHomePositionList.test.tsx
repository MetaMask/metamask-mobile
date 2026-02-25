import React, { ComponentType } from 'react';
import PredictHomePositionList from './PredictHomePositionList';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import { PredictPositionsSelectorsIDs } from '../../Predict.testIds';
import { PredictPosition, PredictPositionStatus } from '../../types';

// Type helper for UNSAFE_getByType with mocked string components
const asComponentType = (name: string) => name as unknown as ComponentType;

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../PredictPosition/PredictPosition', () => 'PredictPosition');
jest.mock(
  '../PredictPositionResolved/PredictPositionResolved',
  () => 'PredictPositionResolved',
);
jest.mock('../PredictNewButton', () => 'PredictNewButton');

const createMockPosition = (
  overrides: Partial<PredictPosition>,
): PredictPosition => ({
  id: 'position-1',
  providerId: 'provider-1',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcome: 'Yes',
  outcomeTokenId: 'token-1',
  currentValue: 100,
  title: 'Test Market',
  icon: 'https://example.com/icon.png',
  amount: 50,
  price: 0.5,
  status: PredictPositionStatus.OPEN,
  size: 100,
  outcomeIndex: 0,
  percentPnl: 10,
  cashPnl: 5,
  claimable: false,
  initialValue: 45,
  avgPrice: 0.45,
  endDate: '2025-12-31',
  ...overrides,
});

const mockActivePositions: PredictPosition[] = [
  createMockPosition({
    id: 'position-1',
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeIndex: 0,
    endDate: '2025-12-31',
  }),
  createMockPosition({
    id: 'position-2',
    marketId: 'market-2',
    outcomeId: 'outcome-2',
    outcomeIndex: 1,
    endDate: '2025-06-30',
  }),
];

const mockClaimablePositions: PredictPosition[] = [
  createMockPosition({
    id: 'position-3',
    marketId: 'market-3',
    outcomeId: 'outcome-3',
    outcomeIndex: 0,
    endDate: '2025-01-15',
    claimable: true,
    status: PredictPositionStatus.WON,
  }),
  createMockPosition({
    id: 'position-4',
    marketId: 'market-4',
    outcomeId: 'outcome-4',
    outcomeIndex: 1,
    endDate: '2025-01-20',
    claimable: true,
    status: PredictPositionStatus.WON,
  }),
];

describe('PredictHomePositionList', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        PreferencesController: {
          ...backgroundState.PreferencesController,
          privacyMode: false,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders active positions list container', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <PredictHomePositionList
        activePositions={mockActivePositions}
        claimablePositions={[]}
      />,
      { state: initialState },
    );

    // Assert
    expect(
      getByTestId(PredictPositionsSelectorsIDs.ACTIVE_POSITIONS_LIST),
    ).toBeOnTheScreen();
  });

  it('renders PredictPosition for each active position', () => {
    // Arrange & Act
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictHomePositionList
        activePositions={mockActivePositions}
        claimablePositions={[]}
      />,
      { state: initialState },
    );

    // Assert
    const positions = UNSAFE_getAllByType(asComponentType('PredictPosition'));
    expect(positions).toHaveLength(mockActivePositions.length);
  });

  it('renders PredictNewButton', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = renderWithProvider(
      <PredictHomePositionList
        activePositions={mockActivePositions}
        claimablePositions={[]}
      />,
      { state: initialState },
    );

    // Assert
    expect(UNSAFE_getByType(asComponentType('PredictNewButton'))).toBeTruthy();
  });

  it('renders claimable positions list when claimable positions exist', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <PredictHomePositionList
        activePositions={mockActivePositions}
        claimablePositions={mockClaimablePositions}
      />,
      { state: initialState },
    );

    // Assert
    expect(
      getByTestId(PredictPositionsSelectorsIDs.CLAIMABLE_POSITIONS_LIST),
    ).toBeOnTheScreen();
  });

  it('renders resolved markets header when claimable positions exist', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(
      <PredictHomePositionList
        activePositions={mockActivePositions}
        claimablePositions={mockClaimablePositions}
      />,
      { state: initialState },
    );

    // Assert
    expect(getByText('Resolved markets')).toBeOnTheScreen();
  });

  it('does not render claimable section when no claimable positions', () => {
    // Arrange & Act
    const { queryByTestId, queryByText } = renderWithProvider(
      <PredictHomePositionList
        activePositions={mockActivePositions}
        claimablePositions={[]}
      />,
      { state: initialState },
    );

    // Assert
    expect(
      queryByTestId(PredictPositionsSelectorsIDs.CLAIMABLE_POSITIONS_LIST),
    ).toBeNull();
    expect(queryByText('Resolved markets')).toBeNull();
  });

  it('renders PredictPositionResolved for each claimable position', () => {
    // Arrange & Act
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictHomePositionList
        activePositions={mockActivePositions}
        claimablePositions={mockClaimablePositions}
      />,
      { state: initialState },
    );

    // Assert
    const resolvedPositions = UNSAFE_getAllByType(
      asComponentType('PredictPositionResolved'),
    );
    expect(resolvedPositions).toHaveLength(mockClaimablePositions.length);
  });

  it('navigates to market details when active position is pressed', () => {
    // Arrange
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictHomePositionList
        activePositions={mockActivePositions}
        claimablePositions={[]}
      />,
      { state: initialState },
    );
    const positions = UNSAFE_getAllByType(asComponentType('PredictPosition'));

    // Act
    positions[0].props.onPress();

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: 'market-1',
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        headerShown: false,
      },
    });
  });

  it('navigates to market details when claimable position is pressed', () => {
    // Arrange
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictHomePositionList
        activePositions={mockActivePositions}
        claimablePositions={mockClaimablePositions}
      />,
      { state: initialState },
    );
    const resolvedPositions = UNSAFE_getAllByType(
      asComponentType('PredictPositionResolved'),
    );

    // Act
    resolvedPositions[0].props.onPress();

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: expect.any(String),
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        headerShown: false,
      },
    });
  });

  it('passes privacyMode to PredictPosition components', () => {
    // Arrange
    const stateWithPrivacy = {
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            ...backgroundState.PreferencesController,
            privacyMode: true,
          },
        },
      },
    };

    // Act
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictHomePositionList
        activePositions={mockActivePositions}
        claimablePositions={[]}
      />,
      { state: stateWithPrivacy },
    );

    // Assert
    const positions = UNSAFE_getAllByType(asComponentType('PredictPosition'));
    positions.forEach((position) => {
      expect(position.props.privacyMode).toBe(true);
    });
  });

  it('sorts claimable positions by end date descending', () => {
    // Arrange
    const unsortedClaimable: PredictPosition[] = [
      createMockPosition({
        id: 'position-a',
        marketId: 'market-a',
        outcomeId: 'outcome-a',
        outcomeIndex: 0,
        endDate: '2025-01-10',
        claimable: true,
        status: PredictPositionStatus.WON,
      }),
      createMockPosition({
        id: 'position-b',
        marketId: 'market-b',
        outcomeId: 'outcome-b',
        outcomeIndex: 1,
        endDate: '2025-01-25',
        claimable: true,
        status: PredictPositionStatus.WON,
      }),
    ];

    // Act
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictHomePositionList
        activePositions={[]}
        claimablePositions={unsortedClaimable}
      />,
      { state: initialState },
    );

    // Assert - First rendered should be the one with later end date
    const resolvedPositions = UNSAFE_getAllByType(
      asComponentType('PredictPositionResolved'),
    );
    expect(resolvedPositions[0].props.position.marketId).toBe('market-b');
    expect(resolvedPositions[1].props.position.marketId).toBe('market-a');
  });
});
