/* eslint-disable import-x/no-namespace */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TransactionField from './TransactionField';
import * as useAnalyticsModule from '../../../../hooks/useAnalytics/useAnalytics';
import * as useCopyClipboardModule from '../hooks/useCopyClipboard';
import { ModalFieldType } from '../../../../../util/notifications';
import MOCK_NOTIFICATIONS from '../../../../UI/Notification/__mocks__/mock_notifications';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { notificationAnalyticsProperties } from '../../../../../util/notifications/methods/notification-analytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

// Mock the required modules
jest.mock('../../../../hooks/useAnalytics/useAnalytics');
jest.mock('../hooks/useCopyClipboard');
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

describe('TransactionField', () => {
  // Arrange
  const mockProps = {
    txHash: '0x123456789abcdef',
    notification: {
      id: '1',
      type: 'transaction',
    },
  };

  const mockTrackEvent = jest.fn();
  const mockCopyToClipboard = jest.fn();

  beforeEach(() => {
    jest.spyOn(useAnalyticsModule, 'useAnalytics').mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    } as unknown as ReturnType<typeof useAnalyticsModule.useAnalytics>);
    jest
      .spyOn(useCopyClipboardModule, 'default')
      .mockReturnValue(mockCopyToClipboard);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should copy transaction hash and track event when copy button is pressed', () => {
    const { getByText } = render(
      <TransactionField
        type={ModalFieldType.TRANSACTION}
        notification={MOCK_NOTIFICATIONS[0]}
        txHash={mockProps.txHash}
      />,
    );
    const copyButton = getByText('transaction.transaction_id');

    fireEvent.press(copyButton);
    const expectedEvent = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED,
    )
      .addProperties({
        ...notificationAnalyticsProperties(MOCK_NOTIFICATIONS[0]),
        clicked_item: 'tx_id',
      })
      .build();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });
});
