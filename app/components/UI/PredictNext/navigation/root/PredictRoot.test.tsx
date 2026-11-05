import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { PredictConfig } from '../../config/predictConfig';
import PredictRoot from './PredictRoot';

let mockConfig: PredictConfig;

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

const config = (polymarket: boolean, kalshi: boolean): PredictConfig => ({
  enabled: true,
  venues: {
    polymarket: { enabled: polymarket },
    kalshi: { enabled: kalshi },
  },
  venueSelection: { enabled: false },
});

describe('PredictRoot', () => {
  it('renders the PredictNext stack for a Kalshi-only rollout', () => {
    mockConfig = config(false, true);

    render(<PredictRoot />);

    expect(screen.getByTestId('predict-next-stack')).toHaveTextContent(
      'kalshi',
    );
    expect(screen.queryByTestId('legacy-predict-stack')).not.toBeOnTheScreen();
  });

  it('renders the legacy stack for a Polymarket-only rollout', () => {
    mockConfig = config(true, false);

    render(<PredictRoot />);

    expect(screen.getByTestId('legacy-predict-stack')).toBeOnTheScreen();
    expect(screen.queryByTestId('predict-next-stack')).not.toBeOnTheScreen();
  });

  it('renders the legacy stack on the legacy lane', () => {
    mockConfig = { ...config(true, true), enabled: false };

    render(<PredictRoot />);

    expect(screen.getByTestId('legacy-predict-stack')).toBeOnTheScreen();
  });
});
