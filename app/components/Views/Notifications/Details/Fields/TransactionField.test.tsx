/* eslint-disable import/no-namespace */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TransactionField from './TransactionField';
import * as useAnalyticsModule from '../../../../hooks/useAnalytics/useAnalytics';
import * as useCopyClipboardModule from '../hooks/useCopyClipboard';
import { ModalFieldType } from '../../../../../util/notifications';
import MOCK_NOTIFICATIONS from '../../../../UI/Notification/__mocks__/mock_notifications';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';

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
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    } as unknown as ReturnType<typeof useAnalyticsModule.useAnalytics>);
    jest
      .spyOn(useCopyClipboardModule, 'default')
      .mockReturnValue(mockCopyToClipboard);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    const expectedEvent = MetricsEventBuilder.createEventBuilder({
      category: 'Notification Detail Clicked',
    })
      .addProperties({
        chain_id: 1,
        clicked_item: 'tx_id',
        notification_id: '3fa85f64-5717-4562-b3fc-2c963f66afa7',
        notification_type: 'eth_sent',
      })
      .build();
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });
});
