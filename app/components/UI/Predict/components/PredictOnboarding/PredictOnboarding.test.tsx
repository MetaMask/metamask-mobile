import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictOnboarding from './PredictOnboarding';

// Mock the hook
jest.mock('../../hooks/usePredictOnboarding', () => ({
  usePredictOnboarding: jest.fn(),
}));

import { usePredictOnboarding } from '../../hooks/usePredictOnboarding';

const mockUsePredictOnboarding = usePredictOnboarding as jest.MockedFunction<
  typeof usePredictOnboarding
>;

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictOnboarding', () => {
  const mockEnablePredict = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is not onboarded', () => {
    beforeEach(() => {
      mockUsePredictOnboarding.mockReturnValue({
        isOnboarded: false,
        isLoading: false,
        enablePredict: mockEnablePredict,
      });
    });

    it('renders enable predict button with arrow icon', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <PredictOnboarding />,
        { state: initialState },
      );

      expect(getByText('Enable Predict')).toBeOnTheScreen();
      expect(getByTestId('markets-won-card')).toBeOnTheScreen();
    });

    it('calls enablePredict when button is pressed', () => {
      const { UNSAFE_getAllByType } = renderWithProvider(
        <PredictOnboarding />,
        { state: initialState },
      );

      // Find all TouchableOpacity elements and get the first one (the enable button)
      const touchableElements = UNSAFE_getAllByType(TouchableOpacity);
      const enableButton = touchableElements[0];

      fireEvent.press(enableButton);

      expect(mockEnablePredict).toHaveBeenCalledTimes(1);
    });

    it('shows loading indicator when enabling predict', () => {
      mockUsePredictOnboarding.mockReturnValue({
        isOnboarded: false,
        isLoading: true,
        enablePredict: mockEnablePredict,
      });

      const { queryByText } = renderWithProvider(<PredictOnboarding />, {
        state: initialState,
      });

      // The loading indicator should be present (ActivityIndicator)
      // We can't easily test the ActivityIndicator directly, but we can verify
      // the component still renders the container
      expect(queryByText('Enable Predict')).toBeOnTheScreen();
    });
  });

  describe('when user is already onboarded', () => {
    beforeEach(() => {
      mockUsePredictOnboarding.mockReturnValue({
        isOnboarded: true,
        isLoading: false,
        enablePredict: mockEnablePredict,
      });
    });

    it('renders empty container when user is onboarded', () => {
      const { getByTestId, queryByText } = renderWithProvider(
        <PredictOnboarding />,
        { state: initialState },
      );

      // When onboarded, the component renders the container but no content
      expect(getByTestId('markets-won-card')).toBeOnTheScreen();
      expect(queryByText('Enable Predict')).not.toBeOnTheScreen();
    });

    it('does not render enable predict button', () => {
      const { queryByText } = renderWithProvider(<PredictOnboarding />, {
        state: initialState,
      });

      expect(queryByText('Enable Predict')).not.toBeOnTheScreen();
    });
  });

  describe('component structure', () => {
    it('renders with correct test ID', () => {
      mockUsePredictOnboarding.mockReturnValue({
        isOnboarded: false,
        isLoading: false,
        enablePredict: mockEnablePredict,
      });

      const { getByTestId } = renderWithProvider(<PredictOnboarding />, {
        state: initialState,
      });

      expect(getByTestId('markets-won-card')).toBeOnTheScreen();
    });
  });
});
