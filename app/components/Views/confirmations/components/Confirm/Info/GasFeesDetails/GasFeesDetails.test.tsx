import React from 'react';
import { cloneDeep } from 'lodash';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import { NETWORKS_CHAIN_ID } from '../../../../../../../constants/network';
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
  it('contains required text', async () => {
    const { getByText } = renderWithProvider(<GasFeesDetails />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('Network Fee')).toBeDefined();
    expect(getByText('$0.34')).toBeDefined();
    expect(getByText('0.0001 ETH')).toBeDefined();
  });

  it('shows fiat if showFiatOnTestnets is true', async () => {
    const clonedStakingDepositConfirmationState = cloneDeep(
      stakingDepositConfirmationState,
    );
    clonedStakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].chainId =
      NETWORKS_CHAIN_ID.SEPOLIA;

    const { getByText } = renderWithProvider(<GasFeesDetails />, {
      state: clonedStakingDepositConfirmationState,
    });
    expect(getByText('$0.34')).toBeDefined();
  });

  it('hides fiat if showFiatOnTestnets is false', async () => {
    const clonedStakingDepositConfirmationState = cloneDeep(
      stakingDepositConfirmationState,
    );
    clonedStakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].chainId =
      NETWORKS_CHAIN_ID.SEPOLIA;
    clonedStakingDepositConfirmationState.settings.showFiatOnTestnets = false;

    const { queryByText } = renderWithProvider(<GasFeesDetails />, {
      state: clonedStakingDepositConfirmationState,
    });
    expect(queryByText('$0.34')).toBeNull();
  });
});
