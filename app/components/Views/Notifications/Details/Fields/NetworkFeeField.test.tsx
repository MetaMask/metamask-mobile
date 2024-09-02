import React from 'react';
import { render } from '@testing-library/react-native';

import NetworkFeeField from './NetworkFeeField';
import MOCK_NOTIFICATIONS from '../../../../../components/UI/Notification/__mocks__/mock_notifications';

jest.mock('../../../../../util/notifications/methods/common', () => ({
  getNetworkFees: () =>
    Promise.resolve({
      gasUsed: '0',
      gasLimit: '0',
      baseFee: '0',
      priorityFee: '0',
      maxFeePerGas: '0',
      effectiveGasPrice: '0',
      transactionFeeInEth: '0',
      transactionFeeInUsd: '0',
    }),
}));

describe('NetworkFeeField', () => {
  const setIsCollapsed = jest.fn();
  const isCollapsed = false;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should renders correctly', () => {
    const { toJSON } = render(
      <NetworkFeeField
        {...MOCK_NOTIFICATIONS[1].data.network_fee}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        getNetworkFees={() =>
          Promise.resolve({
            gasUsed: '0',
            gasLimit: '0',
            baseFee: '0',
            priorityFee: '0',
            maxFeePerGas: '0',
            effectiveGasPrice: '0',
            transactionFeeInEth: '0',
            transactionFeeInUsd: '0',
          })
        }
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
