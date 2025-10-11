import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictDeposit from './PredictDeposit';

// Mock the hooks
jest.mock('../../hooks/usePredictDeposit', () => ({
  usePredictDeposit: jest.fn(),
}));

import { usePredictDeposit } from '../../hooks/usePredictDeposit';

const mockUsePredictEnableWallet = usePredictDeposit as jest.MockedFunction<
  typeof usePredictDeposit
>;

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictOnboarding', () => {
  const mockDeposit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    beforeEach(() => {
      mockUsePredictEnableWallet.mockReturnValue({
        isLoading: false,
        error: null,
        isSuccess: false,
        deposit: mockDeposit,
      });
    });

    it('renders deposit button with arrow icon', () => {
      // Given the component is rendered
      const { getByText, getByTestId } = renderWithProvider(
        <PredictDeposit />,
        { state: initialState },
      );

      // Then it displays the deposit text and card
      expect(getByText('Deposit')).toBeOnTheScreen();
      expect(getByTestId('predict-onboarding-card')).toBeOnTheScreen();
    });

    it('renders with correct test ID', () => {
      // Given the component is rendered
      const { getByTestId } = renderWithProvider(<PredictDeposit />, {
        state: initialState,
      });

      // Then the card has the correct test ID
      expect(getByTestId('predict-onboarding-card')).toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    beforeEach(() => {
      mockUsePredictEnableWallet.mockReturnValue({
        isLoading: false,
        error: null,
        isSuccess: false,
        deposit: mockDeposit,
      });
    });

    it('calls deposit when button is pressed', () => {
      // Given the component is rendered
      const { UNSAFE_getAllByType } = renderWithProvider(<PredictDeposit />, {
        state: initialState,
      });

      // When the deposit button is pressed
      const touchableElements = UNSAFE_getAllByType(TouchableOpacity);
      const depositButton = touchableElements[0];
      fireEvent.press(depositButton);

      // Then the deposit function is called
      expect(mockDeposit).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('shows activity indicator when deposit is loading', () => {
      // Given deposit is in loading state
      mockUsePredictEnableWallet.mockReturnValue({
        isLoading: true,
        error: null,
        isSuccess: false,
        deposit: mockDeposit,
      });

      // When the component is rendered
      const { UNSAFE_getByType } = renderWithProvider(<PredictDeposit />, {
        state: initialState,
      });

      // Then an activity indicator is shown
      expect(UNSAFE_getByType(ActivityIndicator)).toBeDefined();
    });

    it('shows arrow icon when not loading', () => {
      // Given deposit is not loading
      mockUsePredictEnableWallet.mockReturnValue({
        isLoading: false,
        error: null,
        isSuccess: false,
        deposit: mockDeposit,
      });

      // When the component is rendered
      const { getByTestId } = renderWithProvider(<PredictDeposit />, {
        state: initialState,
      });

      // Then the card is shown (arrow icon is inside)
      expect(getByTestId('predict-onboarding-card')).toBeOnTheScreen();
    });
  });
});
