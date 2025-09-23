import React from 'react';
import { render } from '@testing-library/react-native';
import NetworkFeeField from './NetworkFeeField';
import { ModalFieldType } from '../../../../../util/notifications';
import { processNotification } from '@metamask/notification-services-controller/notification-services';
import { createMockNotificationEthReceived } from '@metamask/notification-services-controller/notification-services/mocks';
import NetworkFeeFieldSkeleton from './Skeletons/NetworkFeeField';

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
jest.mock('../../../../hooks/useMetrics/useMetrics');

const MOCK_NOTIFICATION = processNotification(
  createMockNotificationEthReceived(),
);

jest.mock('./NetworkFeeField');

describe('NetworkFeeField', () => {
  const setIsCollapsed = jest.fn();
  const isCollapsed = false;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when type has "ModalField-NetworkFee"', () => {
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

  it('renders loading state', () => {
    jest.mock('./NetworkFeeField', () => ({
      __esModule: true,
      useNetworkFee: () => ({
        data: undefined,
        isLoading: true,
      }),
    }));

    render(
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

    expect(NetworkFeeFieldSkeleton).toBeDefined();
  });
});
