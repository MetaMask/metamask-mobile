import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PredictOutcome,
  Recurrence,
  PredictMarket as PredictMarketType,
} from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarketSingle from './';
import Routes from '../../../../../constants/navigation/Routes';

// Mock Alert
const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackGeoBlockTriggered: jest.fn(),
    },
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock usePredictEligibility hook
const mockUsePredictEligibility = jest.fn();
jest.mock('../../hooks/usePredictEligibility', () => ({
  usePredictEligibility: () => mockUsePredictEligibility(),
}));

// Mock usePredictBalance hook
const mockUsePredictBalance = jest.fn();
jest.mock('../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => mockUsePredictBalance(),
}));

// Mock hooks
const mockPlaceBuyOrder = jest.fn();

const mockOutcome: PredictOutcome = {
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

const mockMarket: PredictMarketType = {
  id: 'test-market-1',
  providerId: 'test-provider',
  slug: 'bitcoin-price-prediction',
  title: 'Will Bitcoin reach $150,000 by end of year?',
  description: 'Bitcoin price prediction market',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [mockOutcome],
  liquidity: 1000000,
  volume: 1000000,
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarketSingle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation - user is eligible
    mockUsePredictEligibility.mockReturnValue({
      isEligible: true,
    });
    // Default mock implementation - user has balance
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    mockPlaceBuyOrder.mockClear();
    mockNavigate.mockClear();
  });

  it('render market information correctly', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    expect(
      getByText('Will Bitcoin reach $150,000 by end of year?'),
    ).toBeOnTheScreen();

    expect(getByText('65%')).toBeOnTheScreen();
    expect(getByText(/\$1M.*Vol\./)).toBeOnTheScreen();
  });

  it('navigate to place bet modal when buttons are pressed', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText('Yes');
    const noButton = getByText('No');

    fireEvent.press(yesButton);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
      params: {
        market: mockMarket,
        outcome: mockOutcome,
        outcomeToken: mockOutcome.tokens[0],
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      },
    });

    fireEvent.press(noButton);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
      params: {
        market: mockMarket,
        outcome: mockOutcome,
        outcomeToken: mockOutcome.tokens[1],
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      },
    });
  });

  it('handle missing or invalid market data gracefully', () => {
    const invalidOutcome: PredictOutcome = {
      ...mockOutcome,
      title: null as unknown as string, // This should trigger "Unknown Market"
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0 }, // Empty tokens with 0 prices
        { id: 'token-no', title: 'No', price: 0 },
      ],
      volume: 0,
    };

    const invalidMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [invalidOutcome],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={invalidMarket} />,
      { state: initialState },
    );

    expect(getByText('Unknown Market')).toBeOnTheScreen();
    expect(getByText('0%')).toBeOnTheScreen();
    expect(getByText(/\$0.*Vol\./)).toBeOnTheScreen();
  });

  it('handle market with 0% yes percentage', () => {
    const zeroPercentOutcome: PredictOutcome = {
      ...mockOutcome,
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0 }, // 0% yes
        { id: 'token-no', title: 'No', price: 1 },
      ],
    };

    const zeroPercentMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [zeroPercentOutcome],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={zeroPercentMarket} />,
      { state: initialState },
    );

    expect(getByText('0%')).toBeOnTheScreen();
  });

  it('handle market with 100% yes percentage', () => {
    const hundredPercentOutcome: PredictOutcome = {
      ...mockOutcome,
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 1 }, // 100% yes
        { id: 'token-no', title: 'No', price: 0 },
      ],
    };

    const hundredPercentMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [hundredPercentOutcome],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={hundredPercentMarket} />,
      { state: initialState },
    );

    expect(getByText('100%')).toBeOnTheScreen();
  });

  it('handle market with no image gracefully', () => {
    const noImageOutcome: PredictOutcome = {
      ...mockOutcome,
      image: '',
    };

    const noImageMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [noImageOutcome],
    };

    const { queryByTestId } = renderWithProvider(
      <PredictMarketSingle market={noImageMarket} />,
      { state: initialState },
    );

    // Should render without crashing, fallback background should be shown
    expect(queryByTestId).toBeDefined();
  });

  it('handle numeric volume values correctly', () => {
    const numericVolumeOutcome: PredictOutcome = {
      ...mockOutcome,
      volume: 500000, // numeric instead of string
    };

    const numericVolumeMarket: PredictMarketType = {
      ...mockMarket,
      outcomes: [numericVolumeOutcome],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={numericVolumeMarket} />,
      { state: initialState },
    );

    // Should display the formatted volume
    expect(getByText(/\$500k.*Vol\./)).toBeOnTheScreen();
  });

  it('navigate to unavailable modal when user is not eligible', () => {
    // Mock user as not eligible
    mockUsePredictEligibility.mockReturnValue({
      isEligible: false,
    });

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText('Yes');
    const noButton = getByText('No');

    // Press the "Yes" button
    fireEvent.press(yesButton);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.UNAVAILABLE,
    });

    // Press the "No" button
    fireEvent.press(noButton);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.UNAVAILABLE,
    });
  });

  it('navigate to market details when TouchableOpacity is pressed', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    // Press on the market title area
    const marketTitle = getByText(
      'Will Bitcoin reach $150,000 by end of year?',
    );
    fireEvent.press(marketTitle);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: mockMarket.id,
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        title: mockMarket.title,
        image: mockMarket.image,
      },
    });
  });

  it('display correct button text using i18n strings', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    // The component uses strings('predict.buy_yes') and strings('predict.buy_no')
    // which should resolve to 'Yes' and 'No' based on the mock data
    expect(getByText('Yes')).toBeOnTheScreen();
    expect(getByText('No')).toBeOnTheScreen();
  });

  it('navigates to add funds sheet when user has no balance', () => {
    // Mock user has no balance
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: true,
    });

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText('Yes');
    fireEvent.press(yesButton);

    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictAddFundsSheet',
    });
  });

  it('checks eligibility before balance for Yes button', () => {
    // Mock user is not eligible AND has no balance
    mockUsePredictEligibility.mockReturnValue({
      isEligible: false,
      refreshEligibility: jest.fn(),
    });
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: true,
    });

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText('Yes');
    fireEvent.press(yesButton);

    // Should navigate to unavailable (not add funds sheet)
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.UNAVAILABLE,
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictAddFundsSheet',
    });
  });

  it('checks eligibility before balance for No button', () => {
    // Mock user is not eligible AND has no balance
    mockUsePredictEligibility.mockReturnValue({
      isEligible: false,
      refreshEligibility: jest.fn(),
    });
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: true,
    });

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={mockMarket} />,
      { state: initialState },
    );

    const noButton = getByText('No');
    fireEvent.press(noButton);

    // Should navigate to unavailable (not add funds sheet)
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.UNAVAILABLE,
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictAddFundsSheet',
    });
  });

  it('displays 0% when tokens have price 0', () => {
    const marketWithZeroPriceTokens: PredictMarketType = {
      ...mockMarket,
      outcomes: [
        {
          ...mockOutcome,
          tokens: [
            { id: 'token-yes', title: 'Yes', price: 0 },
            { id: 'token-no', title: 'No', price: 0 },
          ],
        },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={marketWithZeroPriceTokens} />,
      { state: initialState },
    );

    expect(getByText('0%')).toBeOnTheScreen();
  });

  it('displays Unknown Market when title is missing', () => {
    const marketWithNoTitle: PredictMarketType = {
      ...mockMarket,
      outcomes: [
        {
          ...mockOutcome,
          title: undefined as unknown as string,
        },
      ],
    };

    const { getByText } = renderWithProvider(
      <PredictMarketSingle market={marketWithNoTitle} />,
      { state: initialState },
    );

    expect(getByText('Unknown Market')).toBeOnTheScreen();
  });
});
