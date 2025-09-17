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

const mockSingleOutcome: PredictOutcome = {
  id: 'test-outcome-1',
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
  categories: ['crypto'],
  outcomes: [mockSingleOutcome],
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
  categories: ['crypto'],
  outcomes: [mockMultipleOutcome1, mockMultipleOutcome2],
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render PredictMarketSingle for markets with one outcome', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarket market={mockSingleMarket} />,
      { state: initialState },
    );

    expect(getByTestId('predict-market-single')).toBeOnTheScreen();
  });

  it('should render PredictMarketMultiple for markets with multiple outcomes', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarket market={mockMultipleMarket} />,
      { state: initialState },
    );

    expect(getByTestId('predict-market-multiple')).toBeOnTheScreen();
  });

  it('should pass the market prop correctly to sub-components', () => {
    const { getByText } = renderWithProvider(
      <PredictMarket market={mockSingleMarket} />,
      { state: initialState },
    );

    expect(
      getByText('PredictMarketSingle: Bitcoin Single Market'),
    ).toBeOnTheScreen();
  });
});
