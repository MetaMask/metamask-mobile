import React from 'react';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import Routes from '../../../../../constants/navigation/Routes';

import { ConfirmRoot } from './confirm-root';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    addListener: jest.fn(),
    dispatch: jest.fn(),
  }),
}));

describe('Confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to modal confirmation', async () => {
    renderWithProvider(<ConfirmRoot />, {
      state: personalSignatureConfirmationState,
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenLastCalledWith(
      Routes.CONFIRMATION_REQUEST_MODAL,
    );
  });

  it('does not navigate if confirmation is standalone', async () => {
    renderWithProvider(<ConfirmRoot />, {
      state: stakingDepositConfirmationState,
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
