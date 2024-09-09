import React from 'react';
import { render } from '@testing-library/react-native';
import NetworkFeeField from './NetworkFeeField';
import { OnChainRawNotificationsWithNetworkFields } from '@metamask/notification-services-controller/dist/types/NotificationServicesController/types';
import { ModalFieldType } from '../../../../../util/notifications';
import { NotificationServicesController } from '@metamask/notification-services-controller';

const {
  Processors: { processNotification },
  Mocks,
} = NotificationServicesController;
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
  Mocks.createMockNotificationEthReceived(),
) as OnChainRawNotificationsWithNetworkFields;

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
        {...MOCK_NOTIFICATION.data.network_fee}
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
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
