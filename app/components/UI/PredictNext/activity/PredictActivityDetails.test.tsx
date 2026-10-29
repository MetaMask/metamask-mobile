import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { useActiveVenue } from '../implementation/activeVenue';
import type { ActiveVenueResolution } from '../implementation/types';
import { PredictActivityDetails } from './PredictActivityDetails';

jest.mock('../implementation/activeVenue', () => ({
  useActiveVenue: jest.fn(),
}));

jest.mock('./internal/legacy/details/PredictDetails', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    PredictDetails: ({ item }: { item: ActivityListItem }) => (
      <MockText testID="legacy-details">{item.type}</MockText>
    ),
  };
});

jest.mock('./internal/legacy/details/PredictFundsDetails', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    PredictFundsDetails: ({ item }: { item: ActivityListItem }) => (
      <MockText testID="funds-details">{item.type}</MockText>
    ),
  };
});

const buildItem = (type: ActivityListItem['type']) =>
  ({
    type,
    chainId: 'eip155:137',
    status: 'success',
    timestamp: 1,
    hash: 'predict-1',
    data: { token: { amount: '1', symbol: 'USDC', direction: 'out' } },
  }) as ActivityListItem;

const givenActiveVenue = (resolution: ActiveVenueResolution) =>
  jest.mocked(useActiveVenue).mockReturnValue(resolution);

describe('PredictActivityDetails', () => {
  it.each([
    'predictionPlaced',
    'predictionCashedOut',
    'predictionClaimWinnings',
    'predictionSettled',
    'predictionsAddFunds',
    'predictionsWithdrawFunds',
  ] as const)('renders the legacy templates for %s on legacy', (type) => {
    givenActiveVenue({
      status: 'ready',
      venue: 'polymarket',
      source: 'rollout',
    });

    render(<PredictActivityDetails item={buildItem(type)} />);

    expect(screen.getByTestId('legacy-details')).toHaveTextContent(type);
  });

  it.each(['predictionsAddFunds', 'predictionsWithdrawFunds'] as const)(
    'renders the funding template for %s on next',
    (type) => {
      givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });

      render(<PredictActivityDetails item={buildItem(type)} />);

      expect(screen.getByTestId('funds-details')).toHaveTextContent(type);
      expect(screen.queryByTestId('legacy-details')).toBeNull();
    },
  );

  it.each([
    'predictionPlaced',
    'predictionCashedOut',
    'predictionClaimWinnings',
    'predictionSettled',
  ] as const)('renders nothing for %s on next until E5', (type) => {
    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });

    render(
      <>
        <Text testID="screen">screen</Text>
        <PredictActivityDetails item={buildItem(type)} />
      </>,
    );

    expect(screen.getByTestId('screen')).toBeOnTheScreen();
    expect(screen.queryByTestId('legacy-details')).toBeNull();
    expect(screen.queryByTestId('funds-details')).toBeNull();
  });

  it('renders nothing while the Active Venue resolves', () => {
    givenActiveVenue({ status: 'resolving' });

    render(<PredictActivityDetails item={buildItem('predictionsAddFunds')} />);

    expect(screen.queryByTestId('legacy-details')).toBeNull();
    expect(screen.queryByTestId('funds-details')).toBeNull();
  });
});
