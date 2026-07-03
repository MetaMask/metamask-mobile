import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictWorldCupRoute from './PredictWorldCupRoute';

const mockHubV2Enabled = { value: false };

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockHubV2Enabled.value),
}));

jest.mock('../views/PredictWorldCup', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <Text testID="predict-world-cup-v1">V1</Text>,
  };
});

jest.mock('../views/PredictWorldCupHub', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <Text testID="predict-world-cup-hub-v2">V2</Text>,
  };
});

describe('PredictWorldCupRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders V1 PredictWorldCup when showHubV2 is false', () => {
    mockHubV2Enabled.value = false;

    render(<PredictWorldCupRoute />);

    expect(screen.getByTestId('predict-world-cup-v1')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-world-cup-hub-v2'),
    ).not.toBeOnTheScreen();
  });

  it('renders V2 PredictWorldCupHub when showHubV2 is true', () => {
    mockHubV2Enabled.value = true;

    render(<PredictWorldCupRoute />);

    expect(screen.getByTestId('predict-world-cup-hub-v2')).toBeOnTheScreen();
    expect(screen.queryByTestId('predict-world-cup-v1')).not.toBeOnTheScreen();
  });
});
