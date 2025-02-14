import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import Routes from '../../../../constants/navigation/Routes';

import { ConfirmRoot } from './ConfirmRoot';

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

  // TODO: Add unit test for once we have any existing flat confirmation

  it('navigates to modal confirmation', async () => {
    renderWithProvider(<ConfirmRoot />, {
      state: personalSignatureConfirmationState,
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.CONFIRM_MODAL);
  });

  it('does not navigate if standalone confirmation is enabled', async () => {
    renderWithProvider(<ConfirmRoot />, {
      state: stakingDepositConfirmationState,
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
