import cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { stakingDepositConfirmationState } from '../../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import GasFeeModals from './gas-fee-modals';

jest.mock('../../../../../../../../core/GasPolling/GasPolling', () => ({
  useDataStore: jest.fn(),
  useGasTransaction: jest.fn(() => ({
    totalMaxFee: '0',
    hexMaximumBaseFee: '0x0',
    hexMaximumPriorityFee: '0x0',
    feeTrend: 'down',
  })),
  startGasPolling: jest.fn(),
}));

jest.mock('../../../../../../../../core/Engine', () => ({
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

describe('GasFeeModals', () => {
  it('should render', () => {
    const baseState = cloneDeep(stakingDepositConfirmationState);

    const { toJSON } = renderWithProvider(
      <GasFeeModals gasModalIsOpen setGasModalIsOpen={() => null} />,
      {
        state: baseState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
