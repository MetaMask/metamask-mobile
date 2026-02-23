import React from 'react';
import PredictHomePositionList from './PredictHomePositionList';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import { PredictPositionsSelectorsIDs } from '../../Predict.testIds';

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

const mockActivePositions = [
  {
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeIndex: 0,
    endDate: '2025-12-31',
  },
  {
    marketId: 'market-2',
    outcomeId: 'outcome-2',
    outcomeIndex: 1,
    endDate: '2025-06-30',
  },
];

const mockClaimablePositions = [
  {
    marketId: 'market-3',
    outcomeId: 'outcome-3',
    outcomeIndex: 0,
    endDate: '2025-01-15',
  },
  {
    marketId: 'market-4',
    outcomeId: 'outcome-4',
    outcomeIndex: 1,
    endDate: '2025-01-20',
  },
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
    const positions = UNSAFE_getAllByType('PredictPosition');
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
    expect(UNSAFE_getByType('PredictNewButton')).toBeTruthy();
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
    const resolvedPositions = UNSAFE_getAllByType('PredictPositionResolved');
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
    const positions = UNSAFE_getAllByType('PredictPosition');

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
    const resolvedPositions = UNSAFE_getAllByType('PredictPositionResolved');

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
    const positions = UNSAFE_getAllByType('PredictPosition');
    positions.forEach((position) => {
      expect(position.props.privacyMode).toBe(true);
    });
  });

  it('sorts claimable positions by end date descending', () => {
    // Arrange
    const unsortedClaimable = [
      {
        marketId: 'market-a',
        outcomeId: 'outcome-a',
        outcomeIndex: 0,
        endDate: '2025-01-10',
      },
      {
        marketId: 'market-b',
        outcomeId: 'outcome-b',
        outcomeIndex: 1,
        endDate: '2025-01-25',
      },
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
    const resolvedPositions = UNSAFE_getAllByType('PredictPositionResolved');
    expect(resolvedPositions[0].props.position.marketId).toBe('market-b');
    expect(resolvedPositions[1].props.position.marketId).toBe('market-a');
  });
});
