import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useRoute } from '@react-navigation/native';
import type { PredictConfig } from '../../PredictNext/config/predictConfig';
import PredictMarketListRoute from './PredictMarketListRoute';

let mockConfig: PredictConfig;
let mockHomeRedesignEnabled = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../PredictNext/selectors/predictConfig', () => ({
  selectPredictConfig: () => mockConfig,
}));

jest.mock('../selectors/featureFlags', () => ({
  selectPredictHomeRedesignEnabledFlag: () => mockHomeRedesignEnabled,
}));

jest.mock('../../PredictNext/navigation/PredictNextStack', () => {
  const { Text } = jest.requireActual('react-native');
  const { useNextVenueId } = jest.requireActual(
    '../../PredictNext/implementation',
  );
  return () => <Text testID="predict-next-stack">{useNextVenueId()}</Text>;
});

jest.mock('../views/PredictFeed', () => {
  const { Text } = jest.requireActual('react-native');
  return () => <Text testID="legacy-predict-feed" />;
});

jest.mock('../views/PredictHome', () => {
  const { Text } = jest.requireActual('react-native');
  return () => <Text testID="legacy-predict-home" />;
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

const givenParams = (params?: object) =>
  mockUseRoute.mockReturnValue({
    key: 'PredictMarketList',
    name: 'PredictMarketList',
    params,
  });

describe('PredictMarketListRoute', () => {
  beforeEach(() => {
    mockHomeRedesignEnabled = false;
  });

  it('serves the PredictNext stack the Active Venue for a Kalshi-only rollout', () => {
    mockConfig = config(false, true);
    givenParams();

    render(<PredictMarketListRoute />);

    expect(screen.getByTestId('predict-next-stack')).toHaveTextContent(
      'kalshi',
    );
    expect(screen.queryByTestId('legacy-predict-feed')).not.toBeOnTheScreen();
  });

  it('keeps a parameterized market list on legacy Polymarket', () => {
    mockConfig = config(false, true);
    givenParams({ query: 'election' });

    render(<PredictMarketListRoute />);

    expect(screen.getByTestId('legacy-predict-feed')).toBeOnTheScreen();
    expect(screen.queryByTestId('predict-next-stack')).not.toBeOnTheScreen();
  });

  it.each([
    [false, 'legacy-predict-feed'],
    [true, 'legacy-predict-home'],
  ])(
    'renders the legacy market list while Polymarket is enabled (redesign %s)',
    (redesignEnabled, testId) => {
      mockConfig = config(true, true);
      mockHomeRedesignEnabled = redesignEnabled;
      givenParams();

      render(<PredictMarketListRoute />);

      expect(screen.getByTestId(testId)).toBeOnTheScreen();
      expect(screen.queryByTestId('predict-next-stack')).not.toBeOnTheScreen();
    },
  );
});
