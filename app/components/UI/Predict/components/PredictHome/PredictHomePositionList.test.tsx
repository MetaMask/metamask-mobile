import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PredictPosition, PredictPositionStatus } from '../../types';
import PredictHomePositionList from './PredictHomePositionList';
import PredictPositionResolved from '../PredictPositionResolved/PredictPositionResolved';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../PredictPosition/PredictPosition', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return jest.fn(({ onPress, position }) => (
    <TouchableOpacity testID={`position-${position.id}`} onPress={onPress}>
      <Text>{position.title}</Text>
    </TouchableOpacity>
  ));
});

jest.mock('../PredictPositionResolved/PredictPositionResolved', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return jest.fn(({ onPress, position }) => (
    <TouchableOpacity
      testID={`resolved-position-${position.id}`}
      onPress={onPress}
    >
      <Text>{position.title}</Text>
    </TouchableOpacity>
  ));
});

jest.mock('../PredictNewButton', () => {
  const { View, Text } = jest.requireActual('react-native');
  return () => (
    <View testID="predict-new-button">
      <Text>New Button</Text>
    </View>
  );
});

describe('PredictHomePositionList', () => {
  const createMockPosition = (overrides = {}): PredictPosition => ({
    id: '1',
    providerId: 'provider1',
    marketId: 'market1',
    outcomeId: 'outcome1',
    outcome: 'Yes',
    outcomeTokenId: 'token1',
    currentValue: 100,
    title: 'Test Market 1',
    icon: 'icon1',
    amount: 10,
    price: 1.5,
    status: PredictPositionStatus.OPEN,
    size: 10,
    outcomeIndex: 0,
    realizedPnl: 5,
    percentPnl: 50,
    cashPnl: 5,
    claimable: false,
    initialValue: 10,
    avgPrice: 1.0,
    endDate: '2024-01-01T00:00:00Z',
    negRisk: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders active positions', () => {
    const positions = [
      createMockPosition({ id: '1', outcomeId: 'outcome1', outcomeIndex: 0 }),
      createMockPosition({ id: '2', outcomeId: 'outcome2', outcomeIndex: 1 }),
    ];

    const { getByTestId } = render(
      <PredictHomePositionList
        activePositions={positions}
        claimablePositions={[]}
      />,
    );

    expect(getByTestId('position-1')).toBeOnTheScreen();
    expect(getByTestId('position-2')).toBeOnTheScreen();
  });

  it('renders new button', () => {
    const { getByTestId } = render(
      <PredictHomePositionList activePositions={[]} claimablePositions={[]} />,
    );

    expect(getByTestId('predict-new-button')).toBeOnTheScreen();
  });

  it('renders claimable positions with header', () => {
    const claimablePositions = [
      createMockPosition({
        id: '3',
        claimable: true,
        status: PredictPositionStatus.REDEEMABLE,
      }),
    ];

    const { getByTestId, getByText } = render(
      <PredictHomePositionList
        activePositions={[]}
        claimablePositions={claimablePositions}
      />,
    );

    expect(getByTestId('resolved-position-3')).toBeOnTheScreen();
    expect(getByText('Resolved markets')).toBeOnTheScreen();
  });

  it('navigates to market details when position pressed', () => {
    const positions = [
      createMockPosition({ id: '1', marketId: 'test-market' }),
    ];

    const { getByTestId } = render(
      <PredictHomePositionList
        activePositions={positions}
        claimablePositions={[]}
      />,
    );

    fireEvent.press(getByTestId('position-1'));

    expect(mockNavigate).toHaveBeenCalledWith('Predict', {
      screen: 'PredictMarketDetails',
      params: {
        marketId: 'test-market',
        entryPoint: 'homepage_positions',
        headerShown: false,
      },
    });
  });

  it('navigates to market details when resolved position pressed', () => {
    const claimablePositions = [
      createMockPosition({
        id: '3',
        marketId: 'resolved-market',
        claimable: true,
        status: PredictPositionStatus.REDEEMABLE,
      }),
    ];

    const { getByTestId } = render(
      <PredictHomePositionList
        activePositions={[]}
        claimablePositions={claimablePositions}
      />,
    );

    fireEvent.press(getByTestId('resolved-position-3'));

    expect(mockNavigate).toHaveBeenCalledWith('Predict', {
      screen: 'PredictMarketDetails',
      params: {
        marketId: 'resolved-market',
        entryPoint: 'homepage_positions',
        headerShown: false,
      },
    });
  });

  it('sorts claimable positions by end date descending', () => {
    const claimablePositions = [
      createMockPosition({
        id: '1',
        outcomeId: 'outcome1',
        outcomeIndex: 0,
        endDate: '2024-01-01T00:00:00Z',
        claimable: true,
        status: PredictPositionStatus.REDEEMABLE,
      }),
      createMockPosition({
        id: '2',
        outcomeId: 'outcome2',
        outcomeIndex: 1,
        endDate: '2024-01-03T00:00:00Z',
        claimable: true,
        status: PredictPositionStatus.REDEEMABLE,
      }),
      createMockPosition({
        id: '3',
        outcomeId: 'outcome3',
        outcomeIndex: 2,
        endDate: '2024-01-02T00:00:00Z',
        claimable: true,
        status: PredictPositionStatus.REDEEMABLE,
      }),
    ];

    render(
      <PredictHomePositionList
        activePositions={[]}
        claimablePositions={claimablePositions}
      />,
    );

    const mockResolvedPosition = jest.mocked(PredictPositionResolved);
    const callOrder = mockResolvedPosition.mock.calls.map(
      (call) => call[0].position.id,
    );

    // Positions sorted descending by endDate: 2024-01-03 (id=2), 2024-01-02 (id=3), 2024-01-01 (id=1)
    expect(callOrder).toEqual(['2', '3', '1']);
  });
});
