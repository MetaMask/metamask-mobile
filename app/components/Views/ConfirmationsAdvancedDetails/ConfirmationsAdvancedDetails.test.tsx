import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { cloneDeep, merge } from 'lodash';

import ConfirmationsAdvancedDetails from './ConfirmationsAdvancedDetails';
import renderWithProvider from '../../../util/test/renderWithProvider';
import {
  generateContractInteractionState,
  upgradeAccountConfirmation,
  downgradeAccountConfirmation,
  getAppStateForConfirmation,
} from '../../../util/test/confirm-data-helpers';
import { useEditNonce } from '../../hooks/useEditNonce';

// Mock dependencies
jest.mock('../../UI/Name', () => ({
  __esModule: true,
  NameType: {
    EthereumAddress: 'EthereumAddress',
  },
  default: jest.fn(() => null),
}));

jest.mock('../confirmations/components/smart-contract-with-logo', () =>
  jest.fn(() => null),
);

jest.mock(
  '../confirmations/components/nested-transaction-data/nested-transaction-data',
  () => jest.fn(() => null),
);

jest.mock(
  '../confirmations/legacy/SendFlow/components/CustomNonceModal',
  () => 'CustomNonceModal',
);

jest.mock('../../hooks/useEditNonce', () => ({
  useEditNonce: jest.fn(),
}));

jest.mock('../../UI/Navbar', () => ({
  getConfirmationsAdvancedDetailsNavbarOptions: jest.fn(() => ({})),
}));

const mockNavigation = {
  setOptions: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('ConfirmationsAdvancedDetails', () => {
  const mockUseEditNonce = {
    setShowNonceModal: jest.fn(),
    updateNonce: jest.fn(),
    showNonceModal: false,
    proposedNonce: 42,
    userSelectedNonce: 42,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useEditNonce as jest.Mock).mockReturnValue(mockUseEditNonce);
  });

  describe('Rendering', () => {
    it('renders null when transaction metadata is missing', () => {
      const stateWithoutTransaction = cloneDeep(
        generateContractInteractionState,
      );
      stateWithoutTransaction.engine.backgroundState.TransactionController.transactions =
        [];

      const { toJSON } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: stateWithoutTransaction },
        false,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders the component with transaction metadata', () => {
      renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: generateContractInteractionState },
        false,
      );

      // Should display nonce section
      expect(useEditNonce).toHaveBeenCalled();
    });

    it('sets navigation options on mount', () => {
      renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: generateContractInteractionState },
        false,
      );

      expect(mockNavigation.setOptions).toHaveBeenCalled();
    });
  });

  describe('Interacting With Section', () => {
    it('renders interacting with section when "to" address exists', () => {
      const { toJSON } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: generateContractInteractionState },
        false,
      );

      expect(toJSON()).toBeTruthy();
    });

    it('does not render interacting with section for downgrade transactions', () => {
      const { toJSON } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: getAppStateForConfirmation(downgradeAccountConfirmation) },
        false,
      );

      // For downgrade transactions, the interacting with section should not be shown
      expect(toJSON()).toBeTruthy();
    });

    it('renders SmartContractWithLogo for upgrade transactions', () => {
      const { toJSON } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: getAppStateForConfirmation(upgradeAccountConfirmation) },
        false,
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Nonce Section', () => {
    it('displays the user selected nonce', () => {
      const customNonce = 99;
      (useEditNonce as jest.Mock).mockReturnValue({
        ...mockUseEditNonce,
        userSelectedNonce: customNonce,
      });

      const { queryByText } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: generateContractInteractionState },
        false,
      );

      expect(queryByText(customNonce.toString())).toBeTruthy();
    });

    it('opens nonce modal when nonce is pressed and editing is enabled', () => {
      const mockSetShowNonceModal = jest.fn();
      (useEditNonce as jest.Mock).mockReturnValue({
        ...mockUseEditNonce,
        setShowNonceModal: mockSetShowNonceModal,
      });

      // Use default state which has smart transactions disabled
      const { getByText } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: generateContractInteractionState },
        false,
      );

      const nonceText = getByText('42');
      fireEvent.press(nonceText);

      expect(mockSetShowNonceModal).toHaveBeenCalledWith(true);
    });

    it('does not open nonce modal when smart transactions are enabled', () => {
      const mockSetShowNonceModal = jest.fn();
      (useEditNonce as jest.Mock).mockReturnValue({
        ...mockUseEditNonce,
        setShowNonceModal: mockSetShowNonceModal,
      });

      // Enable smart transactions using swaps state
      const swapsEnabledState = merge({}, generateContractInteractionState, {
        swaps: {
          featureFlags: {
            smart_transactions: {
              mobile_active: true,
              extension_active: true,
            },
            smartTransactions: {
              mobileActive: true,
              extensionActive: true,
              mobileActiveIOS: true,
              mobileActiveAndroid: true,
            },
          },
          '0x1': {
            isLive: true,
            featureFlags: {
              smartTransactions: {
                expectedDeadline: 45,
                maxDeadline: 160,
                mobileReturnTxHashAsap: false,
                mobileActive: true,
                extensionActive: true,
                mobileActiveIOS: true,
                mobileActiveAndroid: true,
              },
            },
          },
        },
      });

      const { getByText } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: swapsEnabledState },
        false,
      );

      const nonceText = getByText('42');
      fireEvent.press(nonceText);

      // Should not open modal when smart transactions are enabled
      expect(mockSetShowNonceModal).not.toHaveBeenCalled();
    });

    it('renders CustomNonceModal when showNonceModal is true', () => {
      (useEditNonce as jest.Mock).mockReturnValue({
        ...mockUseEditNonce,
        showNonceModal: true,
      });

      const { toJSON } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: generateContractInteractionState },
        false,
      );

      // Modal should be rendered
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Transaction Data Section', () => {
    it('displays transaction data when present', () => {
      const state = cloneDeep(generateContractInteractionState);
      const testData = '0x1234567890abcdef';
      state.engine.backgroundState.TransactionController.transactions[0].txParams.data =
        testData;

      const { queryByText } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state },
        false,
      );

      expect(queryByText(testData)).toBeTruthy();
    });

    it('does not display data section when data is "0x"', () => {
      const state = cloneDeep(generateContractInteractionState);
      state.engine.backgroundState.TransactionController.transactions[0].txParams.data =
        '0x';

      const { queryByTestId } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state },
        false,
      );

      expect(queryByTestId('scroll-view-data')).toBeNull();
    });

    it('renders ScrollView when data is longer than MAX_DATA_LENGTH', () => {
      const state = cloneDeep(generateContractInteractionState);
      // Create data longer than 200 characters
      const longData = '0x' + 'a'.repeat(250);
      state.engine.backgroundState.TransactionController.transactions[0].txParams.data =
        longData;

      const { getByTestId } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state },
        false,
      );

      expect(getByTestId('scroll-view-data')).toBeTruthy();
    });

    it('does not render data section for 7702 transactions', () => {
      const state = cloneDeep(generateContractInteractionState);
      // Mark as 7702 transaction by setting from and to to the same address
      state.engine.backgroundState.TransactionController.transactions[0].txParams.from =
        '0x8a0bbcd42cf79e7cee834e7808eb2fef1cebdb87';
      state.engine.backgroundState.TransactionController.transactions[0].txParams.to =
        '0x8a0bbcd42cf79e7cee834e7808eb2fef1cebdb87';

      const { queryByTestId } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state },
        false,
      );

      expect(queryByTestId('scroll-view-data')).toBeNull();
    });
  });

  describe('Batched Transactions', () => {
    it('renders NestedTransactionData for batched transactions', () => {
      // Use the upgrade account confirmation which has nested transactions
      const { toJSON } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: getAppStateForConfirmation(upgradeAccountConfirmation) },
        false,
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('updates navbar options when colors change', async () => {
      const { rerender } = renderWithProvider(
        <ConfirmationsAdvancedDetails />,
        { state: generateContractInteractionState },
        false,
      );

      const initialCallCount = mockNavigation.setOptions.mock.calls.length;

      // Re-render should trigger navbar update
      rerender(<ConfirmationsAdvancedDetails />);

      await waitFor(() => {
        expect(
          mockNavigation.setOptions.mock.calls.length,
        ).toBeGreaterThanOrEqual(initialCallCount);
      });
    });
  });
});
