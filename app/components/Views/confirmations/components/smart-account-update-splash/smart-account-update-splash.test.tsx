import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import Engine from '../../../../../core/Engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationActions from '../../hooks/useConfirmActions';
// eslint-disable-next-line import/no-namespace
import * as AddressUtils from '../../../../../util/address';
import { SmartAccountUpdateSplash } from './smart-account-update-splash';

jest.mock('../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    PreferencesController: {
      setSmartAccountOptInForAccounts: jest.fn(),
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

const renderComponent = (state?: Record<string, unknown>) =>
  renderWithProvider(<SmartAccountUpdateSplash />, {
    state:
      state ??
      getAppStateForConfirmation(upgradeAccountConfirmation, {
        PreferencesController: { smartAccountOptIn: false },
      }),
  });

describe('SmartContractWithLogo', () => {
  beforeEach(() => {
    jest.spyOn(AddressUtils, 'isHardwareAccount').mockReturnValue(false);
  });

  it('renders correctly', () => {
    const { getByText } = renderComponent();
    expect(getByText('Use smart account?')).toBeTruthy();
    expect(getByText('Request for')).toBeTruthy();
  });

  it('close after `Yes` button is clicked', () => {
    const { getByText, queryByText } = renderComponent();
    expect(queryByText('Request for')).toBeTruthy();
    fireEvent.press(getByText('Yes'));
    expect(
      Engine.context.PreferencesController.setSmartAccountOptInForAccounts,
    ).toHaveBeenCalled();
    expect(queryByText('Request for')).toBeNull();
  });

  it('call reject function when `No` button is clicked', () => {
    const mockOnReject = jest.fn();
    jest
      .spyOn(ConfirmationActions, 'useConfirmActions')
      .mockReturnValue({ onConfirm: jest.fn(), onReject: mockOnReject });
    const { getByText, queryByText } = renderComponent();
    expect(queryByText('Request for')).toBeTruthy();
    fireEvent.press(getByText('No'));
    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });

  it('renders null if user has already opted-in for the account', async () => {
    const { queryByText } = renderComponent(
      getAppStateForConfirmation(upgradeAccountConfirmation, {
        PreferencesController: {
          smartAccountOptInForAccounts: [
            upgradeAccountConfirmation.txParams.from,
          ],
        },
      }),
    );

    expect(queryByText('Request for')).toBeNull();
  });

  it('renders null if preference smartAccountOptIn is true and account is not hardware account', async () => {
    const { queryByText } = renderComponent(
      getAppStateForConfirmation(upgradeAccountConfirmation, {
        PreferencesController: { smartAccountOptIn: true },
      }),
    );

    expect(queryByText('Request for')).toBeNull();
  });

  it('does not renders null if preference smartAccountOptIn is true and but account is hardware account', async () => {
    jest.spyOn(AddressUtils, 'isHardwareAccount').mockReturnValue(true);
    const { getByText } = renderComponent(
      getAppStateForConfirmation(upgradeAccountConfirmation, {
        PreferencesController: { smartAccountOptIn: true },
      }),
    );

    expect(getByText('Use smart account?')).toBeTruthy();
    expect(getByText('Request for')).toBeTruthy();
  });
});
