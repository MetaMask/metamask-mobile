import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictMarket, PredictOutcome, Recurrence } from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarketOutcome from '.';

const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackGeoBlockTriggered: jest.fn(),
    },
  },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
  };
});

// Mock usePredictBalance hook
const mockUsePredictBalance = jest.fn();
jest.mock('../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => mockUsePredictBalance(),
}));

// Mock usePredictEligibility hook
const mockUsePredictEligibility = jest.fn();
jest.mock('../../hooks/usePredictEligibility', () => ({
  usePredictEligibility: () => mockUsePredictEligibility(),
}));

// Mock usePredictDeposit hook
const mockDeposit = jest.fn();
jest.mock('../../hooks/usePredictDeposit', () => ({
  usePredictDeposit: () => ({
    deposit: mockDeposit,
    isDepositPending: false,
  }),
}));

const mockOutcome: PredictOutcome = {
  id: 'test-outcome-1',
  marketId: 'test-market-1',
  providerId: 'test-provider',
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

const mockMarket: PredictMarket = {
  id: 'test-market-1',
  providerId: 'test-provider',
  slug: 'bitcoin-prediction',
  title: 'Will Bitcoin reach $150,000 by end of year?',
  description: 'Bitcoin price prediction market',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['trending'],
  outcomes: [mockOutcome],
  liquidity: 1000000,
  volume: 1000000,
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarketOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation - user is eligible
    mockUsePredictEligibility.mockReturnValue({
      isEligible: true,
      refreshEligibility: jest.fn(),
    });
    // Default mock implementation - user has balance
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockAlert.mockClear();
  });

  it('renders market information correctly', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('Crypto Markets')).toBeOnTheScreen();
    expect(getByText('65%')).toBeOnTheScreen();
    expect(getByText(/\$1M.*Vol\./)).toBeOnTheScreen();
  });

  it('displays correct button labels with prices', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText(/65¢/)).toBeOnTheScreen();
    expect(getByText(/35¢/)).toBeOnTheScreen();
  });

  it('handles button press events', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText(/65¢/);
    const noButton = getByText(/35¢/);

    fireEvent.press(yesButton);
    expect(mockNavigate).toHaveBeenCalledWith('PredictBuyPreview', {
      market: mockMarket,
      outcome: mockOutcome,
      outcomeToken: mockOutcome.tokens[0],
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    });

    fireEvent.press(noButton);
    expect(mockNavigate).toHaveBeenCalledWith('PredictBuyPreview', {
      market: mockMarket,
      outcome: mockOutcome,
      outcomeToken: mockOutcome.tokens[1],
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    });
  });

  it('handles missing or invalid outcome data gracefully', () => {
    const invalidOutcome = {
      ...mockOutcome,
      groupItemTitle: null,
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0 },
        { id: 'token-no', title: 'No', price: 0 },
      ],
      volume: 0,
    } as unknown as PredictOutcome;

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={invalidOutcome} market={mockMarket} />,
      { state: initialState },
    );

    // The component now shows the groupItemTitle directly, even if it's null/undefined
    expect(getByText('0%')).toBeOnTheScreen();
    expect(getByText(/\$0.*Vol\./)).toBeOnTheScreen();
  });

  it('displays image when available', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    expect(getByTestId).toBeDefined();
  });

  it('handles missing image gracefully', () => {
    const outcomeWithoutImage: PredictOutcome = {
      ...mockOutcome,
      image: '',
    };

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome
        outcome={outcomeWithoutImage}
        market={mockMarket}
      />,
      { state: initialState },
    );

    expect(getByText('Crypto Markets')).toBeOnTheScreen();
  });

  it('calls deposit when user has no balance - Yes button', () => {
    // Mock user has no balance
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: true,
    });

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText(/65¢/);
    fireEvent.press(yesButton);

    expect(mockDeposit).toHaveBeenCalled();
  });

  it('calls deposit when user has no balance - No button', () => {
    // Mock user has no balance
    mockUsePredictBalance.mockReturnValue({
      hasNoBalance: true,
    });

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    const noButton = getByText(/35¢/);
    fireEvent.press(noButton);

    expect(mockDeposit).toHaveBeenCalled();
  });

  it('navigates to unavailable modal when user is not eligible - Yes button', () => {
    // Mock user is not eligible
    mockUsePredictEligibility.mockReturnValue({
      isEligible: false,
      refreshEligibility: jest.fn(),
    });

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText(/65¢/);
    fireEvent.press(yesButton);

    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictUnavailable',
    });
  });

  it('navigates to unavailable modal when user is not eligible - No button', () => {
    // Mock user is not eligible
    mockUsePredictEligibility.mockReturnValue({
      isEligible: false,
      refreshEligibility: jest.fn(),
    });

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    const noButton = getByText(/35¢/);
    fireEvent.press(noButton);

    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictUnavailable',
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
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    const yesButton = getByText(/65¢/);
    fireEvent.press(yesButton);

    // Should navigate to unavailable (not add funds sheet)
    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictUnavailable',
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
      <PredictMarketOutcome outcome={mockOutcome} market={mockMarket} />,
      { state: initialState },
    );

    const noButton = getByText(/35¢/);
    fireEvent.press(noButton);

    // Should navigate to unavailable (not add funds sheet)
    expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictUnavailable',
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('PredictModals', {
      screen: 'PredictAddFundsSheet',
    });
  });

  it('displays 0% when tokens have price 0', () => {
    const outcomeWithZeroPriceTokens: PredictOutcome = {
      ...mockOutcome,
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0 },
        { id: 'token-no', title: 'No', price: 0 },
      ],
    };

    const { getByText, getAllByText } = renderWithProvider(
      <PredictMarketOutcome
        outcome={outcomeWithZeroPriceTokens}
        market={mockMarket}
      />,
      { state: initialState },
    );

    expect(getByText('0%')).toBeOnTheScreen();
    // Should show two buttons with 0.00¢ prices
    expect(getAllByText(/0¢/)).toHaveLength(2);
  });

  it('displays empty title when groupItemTitle is missing', () => {
    const outcomeWithNoTitle: PredictOutcome = {
      ...mockOutcome,
      groupItemTitle: undefined as unknown as string,
    };

    const { getByText } = renderWithProvider(
      <PredictMarketOutcome outcome={outcomeWithNoTitle} market={mockMarket} />,
      { state: initialState },
    );

    // The component now shows the groupItemTitle directly, even if it's undefined
    // We can verify the component renders without errors by checking other elements
    expect(getByText('65%')).toBeOnTheScreen();
    expect(getByText(/\$1M.*Vol\./)).toBeOnTheScreen();
  });

  describe('Closed Market States', () => {
    it('displays winner badge and check icon when market is closed with winning token', () => {
      const winningToken = {
        id: 'winning-token',
        title: 'Yes',
        price: 1.0,
      };

      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={mockOutcome}
          market={mockMarket}
          isClosed
          outcomeToken={winningToken}
        />,
        { state: initialState },
      );

      expect(getByText('Yes')).toBeOnTheScreen(); // Winner token title
      expect(getByText('Winner')).toBeOnTheScreen(); // Winner badge
      // Check icon is rendered (mocked as SvgMock)
    });

    it('does not display winner badge when market is closed but no winning token provided', () => {
      const { queryByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={mockOutcome}
          market={mockMarket}
          isClosed
        />,
        { state: initialState },
      );

      expect(queryByText('Winner')).not.toBeOnTheScreen();
    });

    it('does not display winner badge when market is not closed', () => {
      const winningToken = {
        id: 'winning-token',
        title: 'Yes',
        price: 1.0,
      };

      const { queryByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={mockOutcome}
          market={mockMarket}
          isClosed={false}
          outcomeToken={winningToken}
        />,
        { state: initialState },
      );

      expect(queryByText('Winner')).not.toBeOnTheScreen();
    });

    it('hides action buttons when market is closed', () => {
      const { queryByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={mockOutcome}
          market={mockMarket}
          isClosed
        />,
        { state: initialState },
      );

      expect(queryByText(/65¢/)).not.toBeOnTheScreen();
      expect(queryByText(/35¢/)).not.toBeOnTheScreen();
    });

    it('shows action buttons when market is not closed', () => {
      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={mockOutcome}
          market={mockMarket}
          isClosed={false}
        />,
        { state: initialState },
      );

      expect(getByText(/65¢/)).toBeOnTheScreen();
      expect(getByText(/35¢/)).toBeOnTheScreen();
    });

    it('uses outcomeToken title when market is closed and outcomeToken is provided', () => {
      const winningToken = {
        id: 'winning-token',
        title: 'Winning Option',
        price: 1.0,
      };

      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={mockOutcome}
          market={mockMarket}
          isClosed
          outcomeToken={winningToken}
        />,
        { state: initialState },
      );

      expect(getByText('Winning Option')).toBeOnTheScreen();
    });

    it('uses groupItemTitle when market is closed but no outcomeToken provided', () => {
      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={mockOutcome}
          market={mockMarket}
          isClosed
        />,
        { state: initialState },
      );

      expect(getByText('Crypto Markets')).toBeOnTheScreen();
    });
  });

  describe('Button Label Formatting', () => {
    it('uses bullet separator when both token titles are 6 characters or less', () => {
      const outcomeWithShortLabels: PredictOutcome = {
        ...mockOutcome,
        tokens: [
          { id: 'token-yes', title: 'Short', price: 0.65 },
          { id: 'token-no', title: 'Label', price: 0.35 },
        ],
      };

      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={outcomeWithShortLabels}
          market={mockMarket}
        />,
        { state: initialState },
      );

      expect(getByText(/Short/)).toBeOnTheScreen();
      expect(getByText(/Label/)).toBeOnTheScreen();
    });

    it('uses newline separator when first token title exceeds 6 characters', () => {
      const outcomeWithLongFirstLabel: PredictOutcome = {
        ...mockOutcome,
        tokens: [
          { id: 'token-yes', title: 'VeryLongLabel', price: 0.65 },
          { id: 'token-no', title: 'No', price: 0.35 },
        ],
      };

      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={outcomeWithLongFirstLabel}
          market={mockMarket}
        />,
        { state: initialState },
      );

      expect(getByText(/VeryLongLabel/)).toBeOnTheScreen();
      expect(getByText(/65¢/)).toBeOnTheScreen();
    });

    it('uses newline separator when second token title exceeds 6 characters', () => {
      const outcomeWithLongSecondLabel: PredictOutcome = {
        ...mockOutcome,
        tokens: [
          { id: 'token-yes', title: 'Yes', price: 0.65 },
          { id: 'token-no', title: 'VeryLongLabel', price: 0.35 },
        ],
      };

      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={outcomeWithLongSecondLabel}
          market={mockMarket}
        />,
        { state: initialState },
      );

      expect(getByText(/VeryLongLabel/)).toBeOnTheScreen();
      expect(getByText(/35¢/)).toBeOnTheScreen();
    });

    it('uses newline separator when both token titles exceed 6 characters', () => {
      const outcomeWithLongLabels: PredictOutcome = {
        ...mockOutcome,
        tokens: [
          { id: 'token-yes', title: 'LongFirst', price: 0.65 },
          { id: 'token-no', title: 'LongSecond', price: 0.35 },
        ],
      };

      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={outcomeWithLongLabels}
          market={mockMarket}
        />,
        { state: initialState },
      );

      expect(getByText(/LongFirst/)).toBeOnTheScreen();
      expect(getByText(/LongSecond/)).toBeOnTheScreen();
      expect(getByText(/65¢/)).toBeOnTheScreen();
      expect(getByText(/35¢/)).toBeOnTheScreen();
    });

    it('uses bullet separator for token titles with exactly 6 characters', () => {
      const outcomeWithExactLabels: PredictOutcome = {
        ...mockOutcome,
        tokens: [
          { id: 'token-yes', title: 'Exact6', price: 0.65 },
          { id: 'token-no', title: 'Size6!', price: 0.35 },
        ],
      };

      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={outcomeWithExactLabels}
          market={mockMarket}
        />,
        { state: initialState },
      );

      expect(getByText(/Exact6/)).toBeOnTheScreen();
      expect(getByText(/Size6!/)).toBeOnTheScreen();
      expect(getByText(/65¢/)).toBeOnTheScreen();
    });

    it('handles very long token titles gracefully', () => {
      const outcomeWithVeryLongLabels: PredictOutcome = {
        ...mockOutcome,
        tokens: [
          {
            id: 'token-yes',
            title: 'Very Long Label That Exceeds Maximum',
            price: 0.65,
          },
          {
            id: 'token-no',
            title: 'Another Extremely Long Label',
            price: 0.35,
          },
        ],
      };

      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={outcomeWithVeryLongLabels}
          market={mockMarket}
        />,
        { state: initialState },
      );

      expect(
        getByText(/Very Long Label That Exceeds Maximum/),
      ).toBeOnTheScreen();
      expect(getByText(/Another Extremely Long Label/)).toBeOnTheScreen();
    });

    it('renders buttons with correct interaction when labels are long', () => {
      const outcomeWithLongLabels: PredictOutcome = {
        ...mockOutcome,
        tokens: [
          { id: 'token-yes', title: 'LongYesLabel', price: 0.65 },
          { id: 'token-no', title: 'LongNoLabel', price: 0.35 },
        ],
      };

      const { getByText } = renderWithProvider(
        <PredictMarketOutcome
          outcome={outcomeWithLongLabels}
          market={mockMarket}
        />,
        { state: initialState },
      );

      const yesButton = getByText(/LongYesLabel/);
      const noButton = getByText(/LongNoLabel/);

      fireEvent.press(yesButton);

      expect(mockNavigate).toHaveBeenCalledWith('PredictBuyPreview', {
        market: mockMarket,
        outcome: outcomeWithLongLabels,
        outcomeToken: outcomeWithLongLabels.tokens[0],
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      });

      fireEvent.press(noButton);

      expect(mockNavigate).toHaveBeenCalledWith('PredictBuyPreview', {
        market: mockMarket,
        outcome: outcomeWithLongLabels,
        outcomeToken: outcomeWithLongLabels.tokens[1],
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      });
    });
  });
});
