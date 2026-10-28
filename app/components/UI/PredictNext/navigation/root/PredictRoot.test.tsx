import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useRoute } from '@react-navigation/native';
import type { PredictConfig } from '../../config/predictConfig';
import PredictRoot from './PredictRoot';

let mockConfig: PredictConfig;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../selectors/predictConfig', () => ({
  selectPredictConfig: () => mockConfig,
}));

jest.mock('../PredictNextStack', () => {
  const { Text } = jest.requireActual('react-native');
  const { useNextVenueId } = jest.requireActual('../../implementation');
  return () => <Text testID="predict-next-stack">{useNextVenueId()}</Text>;
});

jest.mock('../../../Predict/routes', () => {
  const { Text } = jest.requireActual('react-native');
  return () => <Text testID="legacy-predict-stack" />;
});

const mockUseRoute = jest.mocked(useRoute);

const config = (polymarket: boolean, kalshi: boolean): PredictConfig => ({
  enabled: true,
  venues: {
    polymarket: { enabled: polymarket },
    kalshi: { enabled: kalshi },
  },
  venueSelection: { enabled: false },
});

const givenRoute = (params?: object) =>
  mockUseRoute.mockReturnValue({ key: 'Predict', name: 'Predict', params });

describe('PredictRoot', () => {
  it('renders the PredictNext stack for a Kalshi-only rollout', () => {
    mockConfig = config(false, true);
    givenRoute();

    render(<PredictRoot />);

    expect(screen.getByTestId('predict-next-stack')).toHaveTextContent(
      'kalshi',
    );
    expect(screen.queryByTestId('legacy-predict-stack')).not.toBeOnTheScreen();
  });

  it('renders the legacy stack while Polymarket is enabled', () => {
    mockConfig = config(true, true);
    givenRoute();

    render(<PredictRoot />);

    expect(screen.getByTestId('legacy-predict-stack')).toBeOnTheScreen();
    expect(screen.queryByTestId('predict-next-stack')).not.toBeOnTheScreen();
  });

  it.each([
    { screen: 'PredictMarketDetails' },
    { screen: 'PredictMarketList', params: { query: 'election' } },
  ])('keeps a legacy entry point on the legacy stack', (params) => {
    mockConfig = config(false, true);
    givenRoute(params);

    render(<PredictRoot />);

    expect(screen.getByTestId('legacy-predict-stack')).toBeOnTheScreen();
  });

  it('routes a generic market list to the Active Venue', () => {
    mockConfig = config(false, true);
    givenRoute({ screen: 'PredictMarketList' });

    render(<PredictRoot />);

    expect(screen.getByTestId('predict-next-stack')).toBeOnTheScreen();
  });
});
