import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PredictOutcome,
  Recurrence,
  PredictMarket as PredictMarketType,
} from '../../types';
import PredictMarket from './';

// Mock the sub-components
jest.mock('../PredictMarketSingle', () => {
  const { View, Text } = jest.requireActual('react-native');
  return jest.fn(({ market }) => (
    <View testID="predict-market-single">
      <Text>PredictMarketSingle: {market.title}</Text>
    </View>
  ));
});

jest.mock('../PredictMarketMultiple', () => {
  const { View, Text } = jest.requireActual('react-native');
  return jest.fn(({ market }) => (
    <View testID="predict-market-multiple">
      <Text>PredictMarketMultiple: {market.title}</Text>
    </View>
  ));
});

jest.mock('../PredictMarketSportCard', () => {
  const { View, Text } = jest.requireActual('react-native');
  return jest.fn(({ market }) => (
    <View testID="predict-market-sport-card">
      <Text>PredictMarketSportCard: {market.title}</Text>
    </View>
  ));
});

const mockSingleOutcome: PredictOutcome = {
  id: 'test-outcome-1',
  providerId: 'test-provider',
  marketId: 'test-market-1',
  title: 'Will Bitcoin reach $150,000 by end of year?',
  description: 'Bitcoin price prediction market',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  tokens: [
    {
      id: 'token-yes',
      title: 'Yes',
      price: 0.65,
    },
    {
      id: 'token-no',
      title: 'No',
      price: 0.35,
    },
  ],
  volume: 1000000,
  groupItemTitle: 'Crypto Markets',
  negRisk: false,
  tickSize: '0.01',
};

const mockMultipleOutcome1: PredictOutcome = {
  id: 'test-outcome-2',
  providerId: 'test-provider',
  marketId: 'test-market-2',
  title: 'Bitcoin prediction',
  description: 'Bitcoin price prediction',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  tokens: [
    { id: 'token-btc-yes', title: 'Yes', price: 0.55 },
    { id: 'token-btc-no', title: 'No', price: 0.45 },
  ],
  volume: 500000,
  groupItemTitle: 'Bitcoin',
  negRisk: false,
  tickSize: '0.01',
};

const mockMultipleOutcome2: PredictOutcome = {
  id: 'test-outcome-3',
  providerId: 'test-provider',
  marketId: 'test-market-2',
  title: 'Ethereum prediction',
  description: 'Ethereum price prediction',
  image: 'https://example.com/ethereum.png',
  status: 'open',
  tokens: [
    { id: 'token-eth-yes', title: 'Yes', price: 0.75 },
    { id: 'token-eth-no', title: 'No', price: 0.25 },
  ],
  volume: 300000,
  groupItemTitle: 'Ethereum',
  negRisk: false,
  tickSize: '0.01',
};

const mockSingleMarket: PredictMarketType = {
  id: 'test-market-1',
  providerId: 'test-provider',
  slug: 'bitcoin-price-prediction',
  title: 'Bitcoin Single Market',
  description: 'Bitcoin price prediction market',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [mockSingleOutcome],
  liquidity: 1000000,
  volume: 1000000,
};

const mockMultipleMarket: PredictMarketType = {
  id: 'test-market-2',
  providerId: 'test-provider',
  slug: 'crypto-predictions',
  title: 'Crypto Multiple Market',
  description: 'Multiple crypto predictions',
  image: 'https://example.com/crypto.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [mockMultipleOutcome1, mockMultipleOutcome2],
  liquidity: 1000000,
  volume: 1000000,
};

const mockNflGameOutcome: PredictOutcome = {
  id: 'nfl-outcome-1',
  providerId: 'test-provider',
  marketId: 'nfl-market-1',
  title: 'Seahawks vs Broncos',
  description: 'NFL game prediction',
  image: 'https://example.com/nfl.png',
  status: 'open',
  tokens: [
    { id: 'token-sea', title: 'Seahawks', price: 0.55 },
    { id: 'token-den', title: 'Broncos', price: 0.45 },
  ],
  volume: 500000,
  groupItemTitle: 'NFL',
  negRisk: false,
  tickSize: '0.01',
};

const mockNflMarket: PredictMarketType = {
  id: 'nfl-market-1',
  providerId: 'test-provider',
  slug: 'seahawks-vs-broncos',
  title: 'Seahawks vs Broncos',
  description: 'NFL game prediction market',
  image: 'https://example.com/nfl.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['nfl'],
  outcomes: [mockNflGameOutcome],
  liquidity: 1000000,
  volume: 1000000,
  game: {
    id: 'nfl-game-1',
    startTime: '2025-01-20T18:00:00Z',
    status: 'scheduled',
    league: 'nfl',
    elapsed: null,
    period: null,
    score: null,
    homeTeam: {
      id: 'den',
      name: 'Denver Broncos',
      logo: 'https://example.com/broncos.png',
      abbreviation: 'DEN',
      color: '#FC4C02',
      alias: 'Broncos',
    },
    awayTeam: {
      id: 'sea',
      name: 'Seattle Seahawks',
      logo: 'https://example.com/seahawks.png',
      abbreviation: 'SEA',
      color: '#002244',
      alias: 'Seahawks',
    },
  },
};

const initialState = {
  engine: {
    backgroundState,
  },
};

// Helper function to set up test environment
function setupPredictMarketTest(market: PredictMarketType) {
  jest.clearAllMocks();
  return renderWithProvider(<PredictMarket market={market} />, {
    state: initialState,
  });
}

describe('PredictMarket', () => {
  it('renders PredictMarketSingle for markets with one outcome', () => {
    const { getByTestId } = setupPredictMarketTest(mockSingleMarket);

    expect(getByTestId('predict-market-single')).toBeOnTheScreen();
  });

  it('renders PredictMarketMultiple for markets with multiple outcomes', () => {
    const { getByTestId } = setupPredictMarketTest(mockMultipleMarket);

    expect(getByTestId('predict-market-multiple')).toBeOnTheScreen();
  });

  it('passes the market prop correctly to sub-components', () => {
    const { getByText } = setupPredictMarketTest(mockSingleMarket);

    expect(
      getByText('PredictMarketSingle: Bitcoin Single Market'),
    ).toBeOnTheScreen();
  });

  it('renders PredictMarketSportCard for NFL game markets', () => {
    const { getByTestId } = setupPredictMarketTest(mockNflMarket);

    expect(getByTestId('predict-market-sport-card')).toBeOnTheScreen();
  });

  it('passes market prop correctly to PredictMarketSportCard for NFL markets', () => {
    const { getByText } = setupPredictMarketTest(mockNflMarket);

    expect(
      getByText('PredictMarketSportCard: Seahawks vs Broncos'),
    ).toBeOnTheScreen();
  });

  it('renders PredictMarketSingle for single-outcome market without NFL game', () => {
    const { getByTestId, queryByTestId } =
      setupPredictMarketTest(mockSingleMarket);

    expect(getByTestId('predict-market-single')).toBeOnTheScreen();
    expect(queryByTestId('predict-market-sport-card')).toBeNull();
  });

  it('renders PredictMarketMultiple for multi-outcome market without NFL game', () => {
    const { getByTestId, queryByTestId } =
      setupPredictMarketTest(mockMultipleMarket);

    expect(getByTestId('predict-market-multiple')).toBeOnTheScreen();
    expect(queryByTestId('predict-market-sport-card')).toBeNull();
  });
});
