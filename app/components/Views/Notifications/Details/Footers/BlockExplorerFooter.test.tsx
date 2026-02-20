import React, { ComponentProps } from 'react';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';

import { fireEvent, render } from '@testing-library/react-native';
import type { OnChainRawNotification } from '@metamask/notification-services-controller/notification-services';
import { strings } from '../../../../../../locales/i18n';
import BlockExplorerFooter from './BlockExplorerFooter';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../components/hooks/useMetrics';
import { ModalFooterType } from '../../../../../util/notifications/constants/config';
import {
  MOCK_ON_CHAIN_NOTIFICATIONS,
  MOCK_FEATURE_ANNOUNCEMENT_NOTIFICATIONS,
} from '../../../../UI/Notification/__mocks__/mock_notifications';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { getNetworkDetailsFromNotifPayload } from '../../../../../util/notifications';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/notifications', () => ({
  getNetworkDetailsFromNotifPayload: jest.fn(),
}));

jest.mock('../../../../../components/hooks/useMetrics');

const trackEventMock = jest.fn();

(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: trackEventMock,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
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

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

describe('BlockExplorerFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no URL is available', () => {
    (useSelector as jest.Mock).mockReturnValue({});
    (getNetworkDetailsFromNotifPayload as jest.Mock).mockReturnValue({
      blockExplorerUrl: undefined,
    });

    const props: ComponentProps<typeof BlockExplorerFooter> = {
      chainId: 1,
      txHash: '0x123',
      notification: MOCK_ON_CHAIN_NOTIFICATIONS[0],
      type: ModalFooterType.BLOCK_EXPLORER,
    };

    const { toJSON } = render(<BlockExplorerFooter {...props} />);

    expect(toJSON()).toBeNull();
  });

  it('returns null when notification is not on-chain', () => {
    const props: ComponentProps<typeof BlockExplorerFooter> = {
      chainId: 1,
      txHash: '0x123',
      notification: MOCK_FEATURE_ANNOUNCEMENT_NOTIFICATIONS[0],
      type: ModalFooterType.BLOCK_EXPLORER,
    };
    const { toJSON } = render(<BlockExplorerFooter {...props} />);
    expect(toJSON()).toBeNull();
  });

  it('tracks event with chain_id when present in notification', () => {
    (useSelector as jest.Mock).mockReturnValue({});
    (getNetworkDetailsFromNotifPayload as jest.Mock).mockReturnValue({
      blockExplorerUrl: 'https://blockexplorer.com',
    });

    const props: ComponentProps<typeof BlockExplorerFooter> = {
      chainId: 1,
      txHash: '0x123',
      notification: MOCK_ON_CHAIN_NOTIFICATIONS[0],
      type: ModalFooterType.BLOCK_EXPLORER,
    };

    const { getByText } = render(<BlockExplorerFooter {...props} />);

    const button = getByText(strings('asset_details.options.view_on_block'));
    expect(button).toBeDefined();
    fireEvent(button, 'onPress');

    expect(Linking.openURL).toHaveBeenCalled();
    expect(trackEventMock).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED,
      )
        .addProperties({
          notification_id: props.notification.id,
          notification_type: props.notification.type,
          chain_id: (props.notification as OnChainRawNotification).payload
            .chain_id,
          clicked_item: 'block_explorer',
        })
        .build(),
    );
  });
});
