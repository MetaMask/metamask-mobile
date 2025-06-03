import React from 'react';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  downgradeAccountConfirmation,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { Splash } from './splash';

jest.mock('../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    TransactionController: {
      getTransactions: jest.fn().mockReturnValue([]),
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

describe('Splash', () => {
  it('renders splash page if present', async () => {
    const { getByText } = renderWithProvider(<Splash />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });

    expect(getByText('Use smart account?')).toBeTruthy();
    expect(getByText('Request for')).toBeTruthy();
  });

  it('renders null if confirmation is not of type upgrade', async () => {
    const { queryByText } = renderWithProvider(<Splash />, {
      state: getAppStateForConfirmation(downgradeAccountConfirmation),
    });

    expect(queryByText('Use smart account?')).toBeNull();
  });

  it('renders null for internal confirmation', async () => {
    const { queryByText } = renderWithProvider(<Splash />, {
      state: getAppStateForConfirmation(upgradeOnlyAccountConfirmation),
    });

    expect(queryByText('Use smart account?')).toBeNull();
  });
});
