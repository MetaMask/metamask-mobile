import React from 'react';
import { render } from '@testing-library/react-native';
import NetworkFeeField from './NetworkFeeField';
import { ModalFieldType } from '../../../../../util/notifications';
import { processNotification } from '@metamask/notification-services-controller/notification-services';
import { createMockNotificationEthReceived } from '@metamask/notification-services-controller/notification-services/mocks';

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

const MOCK_NOTIFICATION = processNotification(
  createMockNotificationEthReceived(),
);

describe('NetworkFeeField', () => {
  const setIsCollapsed = jest.fn();
  const isCollapsed = false;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should renders correctly when type has "ModalField-NetworkFee"', () => {
    const { toJSON } = render(
      <NetworkFeeField
        type={ModalFieldType.NETWORK_FEE}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        getNetworkFees={() =>
          Promise.resolve({
            gasUsed: 0,
            gasLimit: 0,
            baseFee: 0,
            priorityFee: 0,
            maxFeePerGas: 0,
            effectiveGasPrice: 0,
            transactionFeeInEth: '0',
            transactionFeeInUsd: '0',
            chainId: '0x1',
          })
        }
        notification={MOCK_NOTIFICATION}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
