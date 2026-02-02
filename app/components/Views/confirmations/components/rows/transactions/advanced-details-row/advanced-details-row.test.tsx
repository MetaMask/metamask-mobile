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

describe('AdvancedDetailsRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when transaction metadata is missing', () => {
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

  it('renders the advanced details row', () => {
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
