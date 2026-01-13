import React from 'react';
import { cloneDeep } from 'lodash';
import { fireEvent } from '@testing-library/react-native';

import {
  generateContractInteractionState,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import AdvancedDetailsRow from './advanced-details-row';
import Routes from '../../../../../../../constants/navigation/Routes';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('AdvancedDetailsRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders correctly with transaction metadata', () => {
    const { getByText } = renderWithProvider(
      <AdvancedDetailsRow />,
      { state: generateContractInteractionState },
      false,
    );

    expect(getByText('Advanced details')).toBeTruthy();
  });

  it('navigates to ConfirmationsAdvancedDetails screen when pressed', () => {
    const { getByText } = renderWithProvider(
      <AdvancedDetailsRow />,
      { state: generateContractInteractionState },
      false,
    );

    const advancedDetailsButton = getByText('Advanced details');
    fireEvent.press(advancedDetailsButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.FULL_SCREEN_CONFIRMATIONS.CONFIRMATIONS_ADVANCED_DETAILS,
    );
  });

  it('renders for upgrade+batch confirmation', () => {
    const { getByText } = renderWithProvider(
      <AdvancedDetailsRow />,
      {
        state: getAppStateForConfirmation(upgradeAccountConfirmation),
      },
      false,
    );

    expect(getByText('Advanced details')).toBeTruthy();

    fireEvent.press(getByText('Advanced details'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.FULL_SCREEN_CONFIRMATIONS.CONFIRMATIONS_ADVANCED_DETAILS,
    );
  });
});
