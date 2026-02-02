import React from 'react';
import { cloneDeep, merge } from 'lodash';
import { fireEvent } from '@testing-library/react-native';

import {
  downgradeAccountConfirmation,
  generateContractInteractionState,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useEditNonce } from '../../../../hooks/useEditNonce';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import AdvancedDetailsPage from './AdvancedDetailsPage';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../../UI/Name', () => ({
  __esModule: true,
  NameType: {
    EthereumAddress: 'EthereumAddress',
  },
  default: jest.fn(() => null),
}));

jest.mock(
  '../../legacy/components/CustomNonceModal',
  () => 'CustomNonceModal',
);

jest.mock('../../../../hooks/useEditNonce', () => ({
  useEditNonce: jest.fn(),
}));

jest.mock('../../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    openTooltipModal: jest.fn(),
  })),
}));

describe('AdvancedDetailsPage', () => {
  const mockOpenTooltipModal = jest.fn();
  const mockUseEditNonce = {
    setShowNonceModal: jest.fn(),
    setUserSelectedNonce: jest.fn(),
    updateNonce: jest.fn(),
    showNonceModal: false,
    proposedNonce: 42,
    userSelectedNonce: 42,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useEditNonce as jest.Mock).mockReturnValue(mockUseEditNonce);
    (useTooltipModal as jest.Mock).mockReturnValue({
      openTooltipModal: mockOpenTooltipModal,
    });
  });

  it('does not render when transaction metadata is missing', () => {
    const stateWithoutTransaction = cloneDeep(generateContractInteractionState);
    stateWithoutTransaction.engine.backgroundState.TransactionController.transactions =
      [];

    const { toJSON } = renderWithProvider(
      <AdvancedDetailsPage />,
      { state: stateWithoutTransaction },
      false,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the page with header', () => {
    const { getByText } = renderWithProvider(
      <AdvancedDetailsPage />,
      { state: generateContractInteractionState },
      false,
    );

    expect(getByText('Advanced details')).toBeTruthy();
  });

  it('navigates back when header back button is pressed', () => {
    const { getAllByTestId } = renderWithProvider(
      <AdvancedDetailsPage />,
      { state: generateContractInteractionState },
      false,
    );

    const backButtons = getAllByTestId('button-icon');
    fireEvent.press(backButtons[0]);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders data scroll view when data is too long', () => {
    const state = cloneDeep(generateContractInteractionState);
    state.engine.backgroundState.TransactionController.transactions[0].txParams.data =
      '0x' + 'a'.repeat(1000);

    const { getByTestId } = renderWithProvider(
      <AdvancedDetailsPage />,
      { state },
      false,
    );

    expect(getByTestId('scroll-view-data')).toBeTruthy();
  });

  describe('Nonce tooltip', () => {
    it('opens tooltip modal when info icon is pressed', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <AdvancedDetailsPage />,
        { state: generateContractInteractionState },
        false,
      );

      expect(getByText('Nonce')).toBeTruthy();

      const nonceInfoButton = getByTestId('nonce-tooltip-button');
      fireEvent.press(nonceInfoButton);

      expect(mockOpenTooltipModal).toHaveBeenCalledWith(
        'Nonce',
        expect.any(String),
      );
    });
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
        <AdvancedDetailsPage />,
        { state: stxEnabledState },
        false,
      );

      fireEvent.press(getByText('42'));
      expect(mockSetShowNonceModal).toHaveBeenCalledTimes(0);
    });

    it('nonce is editable if STX is not enabled', () => {
      const { getByText } = renderWithProvider(
        <AdvancedDetailsPage />,
        { state: generateContractInteractionState },
        false,
      );

      fireEvent.press(getByText('42'));
      expect(mockSetShowNonceModal).toHaveBeenCalledTimes(1);
      expect(mockSetShowNonceModal).toHaveBeenCalledWith(true);
    });
  });

  describe('Confirmation types', () => {
    it('displays correct information for downgrade confirmation', () => {
      const { getByText, queryByText } = renderWithProvider(
        <AdvancedDetailsPage />,
        {
          state: getAppStateForConfirmation(downgradeAccountConfirmation),
        },
      );

      expect(getByText('Nonce')).toBeTruthy();
      expect(queryByText('Data')).toBeNull();
      expect(queryByText('Interacting with')).toBeNull();
    });

    it('displays correct information for upgrade confirmation', () => {
      const { getByText, queryByText } = renderWithProvider(
        <AdvancedDetailsPage />,
        {
          state: getAppStateForConfirmation(upgradeOnlyAccountConfirmation),
        },
      );

      expect(getByText('Nonce')).toBeTruthy();
      expect(getByText('Interacting with')).toBeTruthy();
      expect(getByText('Smart contract')).toBeTruthy();
      expect(queryByText('Data')).toBeNull();
    });

    it('displays correct information for upgrade+batch confirmation', () => {
      const { getByText } = renderWithProvider(<AdvancedDetailsPage />, {
        state: getAppStateForConfirmation(upgradeAccountConfirmation),
      });

      expect(getByText('Nonce')).toBeTruthy();
      expect(getByText('Interacting with')).toBeTruthy();
      expect(getByText('Smart contract')).toBeTruthy();
      expect(getByText('Transaction 1')).toBeTruthy();
      expect(getByText('Transaction 2')).toBeTruthy();
    });
  });
});
