import React from 'react';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  downgradeAccountConfirmation,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { Splash } from './splash';

jest.mock('../../hooks/useConfirmActions', () => ({
  useConfirmActions: () => ({
    onConfirm: jest.fn(),
    onReject: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../hooks/gas/useGasFeeToken');

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    TransactionController: {
      getTransactions: jest.fn().mockReturnValue([]),
    },
    KeyringController: {
      state: { keyrings: [] },
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
  renderWithProvider(<Splash />, {
    state:
      state ??
      getAppStateForConfirmation(upgradeAccountConfirmation, {
        PreferencesController: { smartAccountOptIn: false },
      }),
  });

describe('Splash', () => {
  it('renders splash page if present', async () => {
    const { getByText } = renderComponent();

    expect(getByText('Use smart account?')).toBeTruthy();
  });

  it('renders null if confirmation is not of type upgrade', async () => {
    const { queryByText } = renderComponent(
      getAppStateForConfirmation(downgradeAccountConfirmation),
    );

    expect(queryByText('Use smart account?')).toBeNull();
  });

  it('renders null for internal confirmation', async () => {
    const { queryByText } = renderComponent(
      getAppStateForConfirmation(upgradeOnlyAccountConfirmation, {
        PreferencesController: { smartAccountOptIn: false },
      }),
    );

    expect(queryByText('Use smart account?')).toBeNull();
  });
});
