import React from 'react';
import { cloneDeep, merge } from 'lodash';
import { fireEvent } from '@testing-library/react-native';

import {
  downgradeAccountConfirmation,
  generateContractInteractionState,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { useEditNonce } from '../../../../../../hooks/useEditNonce';
import AdvancedDetailsRow from './advanced-details-row';

jest.mock('../../../../../../UI/Name', () => ({
  __esModule: true,
  NameType: {
    EthereumAddress: 'EthereumAddress',
  },
  default: jest.fn(() => null),
}));

jest.mock(
  '../../../../legacy/components/CustomNonceModal',
  () => 'CustomNonceModal',
);

jest.mock('../../../../../../hooks/useEditNonce', () => ({
  useEditNonce: jest.fn(),
}));

describe('AdvancedDetailsRow', () => {
  const mockUseEditNonce = {
    setShowNonceModal: jest.fn(),
    setUserSelectedNonce: jest.fn(),
    showNonceModal: false,
    proposedNonce: 42,
    userSelectedNonce: 42,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useEditNonce as jest.Mock).mockReturnValue(mockUseEditNonce);
  });

  it('does not render when transaction metadata is missing', () => {
    // Create state without transaction to ensure metadata is missing
    const stateWithoutTransaction = cloneDeep(generateContractInteractionState);
    stateWithoutTransaction.engine.backgroundState.TransactionController.transactions =
      [];

    const { toJSON } = renderWithProvider(
      <AdvancedDetailsRow />,
      { state: stateWithoutTransaction },
      false,
    );
    expect(toJSON()).toBeNull();
  });

  // We can't easily test interactions in this case because our mocks are simple string replacements
  // Testing the basic rendering is still valuable
  it('should set up the component with correct props', () => {
    (useEditNonce as jest.Mock).mockReturnValue({
      ...mockUseEditNonce,
      userSelectedNonce: 42,
    });

    renderWithProvider(
      <AdvancedDetailsRow />,
      { state: generateContractInteractionState },
      false,
    );

    // Verify the hook was called
    expect(useEditNonce).toHaveBeenCalled();
  });

  it('renders data scroll view when data is too long', () => {
    const state = cloneDeep(generateContractInteractionState);
    state.engine.backgroundState.TransactionController.transactions[0].txParams.data =
      '0x' + 'a'.repeat(1000);

    const { getByTestId, getByText } = renderWithProvider(
      <AdvancedDetailsRow />,
      { state },
      false,
    );
    fireEvent.press(getByText('Advanced details'));
    expect(getByTestId('scroll-view-data')).toBeTruthy();
  });

  describe('Nonce editing', () => {
    const mockSetShowNonceModal = jest.fn();
    beforeEach(() => {
      jest.clearAllMocks();
      (useEditNonce as jest.Mock).mockReturnValue({
        ...mockUseEditNonce,
        setShowNonceModal: mockSetShowNonceModal,
      });
    });

    it('nonce is not editable if STX is enabled', () => {
      const stxEnabledState = merge({}, generateContractInteractionState, {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                smartTransactionsNetworks: {
                  '0x1': {
                    mobileActive: true,
                    mobileActiveIOS: true,
                    mobileActiveAndroid: true,
                  },
                },
              },
            },
          },
        },
      });

      const { getByText } = renderWithProvider(
        <AdvancedDetailsRow />,
        { state: stxEnabledState },
        false,
      );

      fireEvent.press(getByText('Advanced details'));
      fireEvent.press(getByText('42'));
      expect(mockSetShowNonceModal).toHaveBeenCalledTimes(0);
    });

    it('nonce is editable if STX is not enabled', () => {
      const { getByText } = renderWithProvider(
        <AdvancedDetailsRow />,
        { state: generateContractInteractionState },
        false,
      );
      fireEvent.press(getByText('Advanced details'));

      fireEvent.press(getByText('42'));
      expect(mockSetShowNonceModal).toHaveBeenCalledTimes(1);
      expect(mockSetShowNonceModal).toHaveBeenCalledWith(true);
    });
  });

  it('display correct information for downgrade confirmation', () => {
    const { getByText, queryByText } = renderWithProvider(
      <AdvancedDetailsRow />,
      {
        state: getAppStateForConfirmation(downgradeAccountConfirmation),
      },
    );

    fireEvent.press(getByText('Advanced details'));

    expect(getByText('Nonce')).toBeTruthy();
    expect(queryByText('Data')).toBeNull();
    expect(queryByText('Interacting with')).toBeNull();
  });

  it('display correct information for upgrade confirmation', () => {
    const { getByText, queryByText } = renderWithProvider(
      <AdvancedDetailsRow />,
      {
        state: getAppStateForConfirmation(upgradeOnlyAccountConfirmation),
      },
    );

    fireEvent.press(getByText('Advanced details'));

    expect(getByText('Nonce')).toBeTruthy();
    expect(getByText('Interacting with')).toBeTruthy();
    expect(getByText('Smart contract')).toBeTruthy();
    expect(queryByText('Data')).toBeNull();
  });

  it('display correct information for upgrade+batch confirmation', () => {
    const { getByText } = renderWithProvider(<AdvancedDetailsRow />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });

    fireEvent.press(getByText('Advanced details'));

    expect(getByText('Nonce')).toBeTruthy();
    expect(getByText('Interacting with')).toBeTruthy();
    expect(getByText('Smart contract')).toBeTruthy();
    expect(getByText('Transaction 1')).toBeTruthy();
    expect(getByText('Transaction 2')).toBeTruthy();
  });
});
