import React from 'react';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';

import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import BlockExplorerFooter from './BlockExplorerFooter';
import { MetaMetricsEvents } from '../../../../../components/hooks/useMetrics';
import mockUseMetrics from '../../../../../components/hooks/useMetrics/useMetrics';
import { getBlockExplorerByChainId } from '../../../../../util/notifications';
import { ModalFooterType } from '../../../../../util/notifications/constants/config';
import MOCK_NOTIFICATIONS from '../../../../UI/Notification/__mocks__/mock_notifications';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/notifications', () => ({
  getBlockExplorerByChainId: jest.fn(),
}));

jest.mock('../../../../../components/hooks/useMetrics/useMetrics');
const { trackEvent } = mockUseMetrics();
const trackEventMock = jest.mocked(trackEvent);

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

describe('BlockExplorerFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no URL is available', () => {
    (useSelector as jest.Mock).mockReturnValue({});
    (getBlockExplorerByChainId as jest.Mock).mockReturnValue(undefined);

    const props = {
      chainId: 1,
      txHash: '0x123',
      notification: MOCK_NOTIFICATIONS[0],
      type: ModalFooterType.BLOCK_EXPLORER,
    } as const;

    const { toJSON } = render(<BlockExplorerFooter {...props} />);

    expect(toJSON()).toBeNull();
  });

  it('tracks event with chain_id when present in notification', () => {
    (useSelector as jest.Mock).mockReturnValue({});
    (getBlockExplorerByChainId as jest.Mock).mockReturnValue(
      'https://blockexplorer.com',
    );

    const props = {
      chainId: 1,
      txHash: '0x123',
      notification: { ...MOCK_NOTIFICATIONS[0], chain_id: 1 },
      type: ModalFooterType.BLOCK_EXPLORER,
    } as const;

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
          chain_id: props.notification.chain_id,
          clicked_item: 'block_explorer',
        })
        .build(),
    );
  });
});
