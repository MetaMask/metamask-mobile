import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationActions from '../../../hooks/useConfirmActions';
import { SmartAccountUpdate } from './smart-account-update';

jest.mock('../../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('SmartContractWithLogo', () => {
  it('renders correctly', () => {
    const { getByText } = renderWithProvider(<SmartAccountUpdate />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(getByText('Use smart account?')).toBeTruthy();
    expect(getByText('Request for')).toBeTruthy();
  });

  it('close after `Yes` button is clicked', () => {
    const { getByText, queryByText } = renderWithProvider(
      <SmartAccountUpdate />,
      {
        state: getAppStateForConfirmation(upgradeAccountConfirmation),
      },
    );
    expect(queryByText('Request for')).toBeTruthy();
    fireEvent.press(getByText('Yes'));
    expect(queryByText('Request for')).toBeNull();
  });

  it('call reject function when `No` button is clicked', () => {
    const mockOnReject = jest.fn();
    jest
      .spyOn(ConfirmationActions, 'useConfirmActions')
      .mockReturnValue({ onConfirm: jest.fn(), onReject: mockOnReject });
    const { getByText, queryByText } = renderWithProvider(
      <SmartAccountUpdate />,
      {
        state: getAppStateForConfirmation(upgradeAccountConfirmation),
      },
    );
    expect(queryByText('Request for')).toBeTruthy();
    fireEvent.press(getByText('No'));
    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });
});
