import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationReducerActions from '../../../../../actions/confirmations';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationActions from '../../hooks/useConfirmActions';
import { SmartAccountUpdateSplash } from './smart-account-update-splash';
import { useDispatch } from 'react-redux';

jest.mock('../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
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

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

describe('SmartContractWithLogo', () => {
  it('renders correctly', () => {
    const { getByText } = renderWithProvider(<SmartAccountUpdateSplash />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(getByText('Use smart account?')).toBeTruthy();
    expect(getByText('Request for')).toBeTruthy();
  });

  it('close after `Yes` button is clicked', () => {
    const mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    const spyUpgradeSplashPageAcknowledgedForAccount = jest.spyOn(
      ConfirmationReducerActions,
      'upgradeSplashPageAcknowledgedForAccount',
    );

    const { getByText, queryByText } = renderWithProvider(
      <SmartAccountUpdateSplash />,
      {
        state: getAppStateForConfirmation(upgradeAccountConfirmation),
      },
    );
    expect(queryByText('Request for')).toBeTruthy();
    fireEvent.press(getByText('Yes'));
    expect(mockDispatch).toHaveBeenCalled();
    expect(spyUpgradeSplashPageAcknowledgedForAccount).toHaveBeenCalled();
    expect(queryByText('Request for')).toBeNull();
  });

  it('call reject function when `No` button is clicked', () => {
    const mockOnReject = jest.fn();
    jest
      .spyOn(ConfirmationActions, 'useConfirmActions')
      .mockReturnValue({ onConfirm: jest.fn(), onReject: mockOnReject });
    const { getByText, queryByText } = renderWithProvider(
      <SmartAccountUpdateSplash />,
      {
        state: getAppStateForConfirmation(upgradeAccountConfirmation),
      },
    );
    expect(queryByText('Request for')).toBeTruthy();
    fireEvent.press(getByText('No'));
    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });

  it('renders null if splash page is already acknowledged for the account', async () => {
    const mockState = getAppStateForConfirmation(upgradeAccountConfirmation);
    const { queryByText } = renderWithProvider(<SmartAccountUpdateSplash />, {
      state: {
        ...mockState,
        confirmation: {
          upgradeSplashPageAcknowledgedForAccounts: [
            upgradeAccountConfirmation.txParams.from,
          ],
        },
      },
    });

    expect(queryByText('Request for')).toBeNull();
  });
});
