import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import GasFeesDetails from './GasFeesDetails';

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
  },
}));

describe('GasFeesDetails', () => {
  it('should contained required text', async () => {
    const { getByText } = renderWithProvider(<GasFeesDetails />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('Network Fee')).toBeDefined();
    expect(getByText('$0.34')).toBeDefined();
    expect(getByText('0.0001 ETH')).toBeDefined();
  });
});
