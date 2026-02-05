import React from 'react';
import { cloneDeep } from 'lodash';
import { fireEvent } from '@testing-library/react-native';

import { generateContractInteractionState } from '../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../../constants/navigation/Routes';
import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import AdvancedDetailsRow from './advanced-details-row';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockUseFullScreenConfirmation = jest.fn();
jest.mock('../../../../hooks/ui/useFullScreenConfirmation', () => ({
  useFullScreenConfirmation: () => mockUseFullScreenConfirmation(),
}));

jest.mock('../../../../../../hooks/useEditNonce', () => ({
  useEditNonce: () => ({
    setShowNonceModal: jest.fn(),
    updateNonce: jest.fn(),
    showNonceModal: false,
    proposedNonce: '0',
    userSelectedNonce: '0',
  }),
}));

jest.mock('../../../../hooks/7702/use7702TransactionType', () => ({
  use7702TransactionType: () => ({
    isBatched: false,
    isUpgrade: false,
    is7702transaction: false,
    isDowngrade: false,
  }),
}));

describe('AdvancedDetailsRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFullScreenConfirmation.mockReturnValue({
      isFullScreenConfirmation: false,
    });
  });

  describe('when transaction metadata is missing', () => {
    it('does not render', () => {
      const stateWithoutTransaction = cloneDeep(
        generateContractInteractionState,
      );
      stateWithoutTransaction.engine.backgroundState.TransactionController.transactions =
        [];

      const { toJSON } = renderWithProvider(
        <AdvancedDetailsRow />,
        { state: stateWithoutTransaction },
        false,
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('modal context (dApp requests)', () => {
    beforeEach(() => {
      mockUseFullScreenConfirmation.mockReturnValue({
        isFullScreenConfirmation: false,
      });
    });

    it('renders the expandable advanced details row', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <AdvancedDetailsRow />,
        { state: generateContractInteractionState },
        false,
      );

      expect(getByText('Advanced details')).toBeOnTheScreen();
      expect(
        getByTestId(ConfirmationRowComponentIDs.ADVANCED_DETAILS),
      ).toBeOnTheScreen();
    });

    it('does not navigate when pressed, opens expandable modal instead', () => {
      const { getByTestId } = renderWithProvider(
        <AdvancedDetailsRow />,
        { state: generateContractInteractionState },
        false,
      );

      const advancedDetailsButton = getByTestId(
        ConfirmationRowComponentIDs.ADVANCED_DETAILS,
      );
      fireEvent.press(advancedDetailsButton);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('fullscreen context (wallet-initiated)', () => {
    beforeEach(() => {
      mockUseFullScreenConfirmation.mockReturnValue({
        isFullScreenConfirmation: true,
      });
    });

    it('renders the navigation advanced details row', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <AdvancedDetailsRow />,
        { state: generateContractInteractionState },
        false,
      );

      expect(getByText('Advanced details')).toBeOnTheScreen();
      expect(
        getByTestId(ConfirmationRowComponentIDs.ADVANCED_DETAILS),
      ).toBeOnTheScreen();
    });

    it('navigates to AdvancedDetailsPage when pressed', () => {
      const { getByTestId } = renderWithProvider(
        <AdvancedDetailsRow />,
        { state: generateContractInteractionState },
        false,
      );

      const advancedDetailsButton = getByTestId(
        ConfirmationRowComponentIDs.ADVANCED_DETAILS,
      );
      fireEvent.press(advancedDetailsButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.FULL_SCREEN_CONFIRMATIONS.ADVANCED_DETAILS,
      );
    });
  });
});
