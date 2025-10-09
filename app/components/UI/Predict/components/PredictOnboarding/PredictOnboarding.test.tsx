import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictOnboarding from './PredictOnboarding';

// Mock the hooks
jest.mock('../../hooks/usePredictAccountState', () => ({
  usePredictAccountState: jest.fn(),
}));

jest.mock('../../hooks/usePredictEnableWallet', () => ({
  usePredictEnableWallet: jest.fn(),
}));

import { usePredictAccountState } from '../../hooks/usePredictAccountState';
import { usePredictEnableWallet } from '../../hooks/usePredictEnableWallet';

const mockUsePredictAccountState =
  usePredictAccountState as jest.MockedFunction<typeof usePredictAccountState>;

const mockUsePredictEnableWallet =
  usePredictEnableWallet as jest.MockedFunction<typeof usePredictEnableWallet>;

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictOnboarding', () => {
  const mockEnableWallet = jest.fn();
  const mockLoadAccountState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is not onboarded', () => {
    beforeEach(() => {
      mockUsePredictAccountState.mockReturnValue({
        address: '0x1234',
        isDeployed: false,
        hasAllowances: false,
        balance: 0,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadAccountState: mockLoadAccountState,
      });

      mockUsePredictEnableWallet.mockReturnValue({
        isLoading: false,
        error: null,
        isSuccess: false,
        enableWallet: mockEnableWallet,
      });
    });

    it('renders enable predict button with arrow icon', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <PredictOnboarding />,
        { state: initialState },
      );

      expect(getByText('Deploy Predict Wallet')).toBeOnTheScreen();
      expect(getByTestId('predict-onboarding-card')).toBeOnTheScreen();
    });

    it('calls enableWallet when button is pressed', () => {
      const { UNSAFE_getAllByType } = renderWithProvider(
        <PredictOnboarding />,
        { state: initialState },
      );

      // Find all TouchableOpacity elements and get the first one (the enable button)
      const touchableElements = UNSAFE_getAllByType(TouchableOpacity);
      const enableButton = touchableElements[0];

      fireEvent.press(enableButton);

      expect(mockEnableWallet).toHaveBeenCalledTimes(1);
    });

    it('renders nothing when loading account state', () => {
      mockUsePredictAccountState.mockReturnValue({
        address: '0x1234',
        isDeployed: false,
        hasAllowances: false,
        balance: 0,
        isLoading: true,
        isRefreshing: false,
        error: null,
        loadAccountState: mockLoadAccountState,
      });

      mockUsePredictEnableWallet.mockReturnValue({
        isLoading: false,
        error: null,
        isSuccess: false,
        enableWallet: mockEnableWallet,
      });

      const { queryByText, queryByTestId } = renderWithProvider(
        <PredictOnboarding />,
        {
          state: initialState,
        },
      );

      // When loading account state, the component returns null
      expect(queryByTestId('predict-onboarding-card')).not.toBeOnTheScreen();
      expect(queryByText('Deploy Predict Wallet')).not.toBeOnTheScreen();
    });
  });

  describe('when user is already onboarded', () => {
    beforeEach(() => {
      mockUsePredictAccountState.mockReturnValue({
        address: '0x1234',
        isDeployed: true,
        hasAllowances: true,
        balance: 0,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadAccountState: mockLoadAccountState,
      });

      mockUsePredictEnableWallet.mockReturnValue({
        isLoading: false,
        error: null,
        isSuccess: false,
        enableWallet: mockEnableWallet,
      });
    });

    it('renders nothing when user is onboarded', () => {
      const { queryByTestId, queryByText } = renderWithProvider(
        <PredictOnboarding />,
        { state: initialState },
      );

      // When onboarded (deployed and has allowances), the component renders null
      expect(queryByTestId('predict-onboarding-card')).not.toBeOnTheScreen();
      expect(queryByText('Deploy Predict Wallet')).not.toBeOnTheScreen();
    });

    it('does not render enable predict button', () => {
      const { queryByText } = renderWithProvider(<PredictOnboarding />, {
        state: initialState,
      });

      expect(queryByText('Deploy Predict Wallet')).not.toBeOnTheScreen();
      expect(queryByText('Enable allowances')).not.toBeOnTheScreen();
    });
  });

  describe('component structure', () => {
    it('renders with correct test ID', () => {
      mockUsePredictAccountState.mockReturnValue({
        address: '0x1234',
        isDeployed: false,
        hasAllowances: false,
        balance: 0,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadAccountState: mockLoadAccountState,
      });

      mockUsePredictEnableWallet.mockReturnValue({
        isLoading: false,
        error: null,
        isSuccess: false,
        enableWallet: mockEnableWallet,
      });

      const { getByTestId } = renderWithProvider(<PredictOnboarding />, {
        state: initialState,
      });

      expect(getByTestId('predict-onboarding-card')).toBeOnTheScreen();
    });
  });
});
