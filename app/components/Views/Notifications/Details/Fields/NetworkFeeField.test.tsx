import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import NetworkFeeField from './NetworkFeeField';
import { ModalFieldType } from '../../../../../util/notifications';
import { processNotification } from '@metamask/notification-services-controller/notification-services';
import { createMockNotificationEthReceived } from '@metamask/notification-services-controller/notification-services/mocks';
import NetworkFeeFieldSkeleton from './Skeletons/NetworkFeeField';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';

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
jest.mock('../../../../hooks/useMetrics');
const MOCK_NOTIFICATION = processNotification(
  createMockNotificationEthReceived(),
);

describe('NetworkFeeField', () => {
  const setIsCollapsed = jest.fn();
  const isCollapsed = false;
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: jest.fn(),
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      isEnabled: jest.fn(),
      getMetaMetricsId: jest.fn(),
    });
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

  it('should toggle isCollapsed and track event when pressed', () => {
    const { getByTestId } = render(
      <NetworkFeeField
        type={ModalFieldType.NETWORK_FEE}
        notification={MOCK_NOTIFICATION}
        isCollapsed
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
      />
    );

    const touchable = getByTestId('network-fee-field');
    fireEvent.press(touchable);

    expect(setIsCollapsed).toHaveBeenCalledWith(false);
    expect(setIsCollapsed).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED, {
      notification_id: MOCK_NOTIFICATION.id,
      notification_type: MOCK_NOTIFICATION.type,
      ...('chain_id' in MOCK_NOTIFICATION && {
        chain_id: MOCK_NOTIFICATION.chain_id,
      }),
      clicked_item: 'fee_details',
    });
  });
});
