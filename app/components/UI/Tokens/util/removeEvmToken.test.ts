import { removeEvmToken } from './removeEvmToken';
import NotificationManager from '../../../../core/NotificationManager';
import Logger from '../../../../util/Logger';
import { Hex } from '@metamask/utils';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { TokenI } from '../types';

jest.mock('../../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('removeEvmToken', () => {
  const mockToken = {
    chainId: '0x1' as Hex,
    address: '0x123456789abcdef',
    symbol: 'ETH',
  } as TokenI;

  const mockCreateEventBuilder = jest.fn(
    () =>
      ({
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue('mockEvent'),
      }) as unknown as ReturnType<
        typeof AnalyticsEventBuilder.createEventBuilder
      >,
  );

  const mockProps = {
    tokenToRemove: mockToken,
    currentChainId: '0x1',
    trackEvent: jest.fn(),
    strings: jest.fn((key) => key),
    getDecimalChainId: jest.fn(() => 1),
    createEventBuilder: mockCreateEventBuilder,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show a notification and track event', async () => {
    await removeEvmToken(mockProps);

    // Check if notification is shown
    expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith({
      status: `simple_notification`,
      duration: 5000,
      title: 'wallet.token_toast.token_hidden_title',
      description: 'wallet.token_toast.token_hidden_desc',
    });

    // Check if tracking event is fired
    expect(mockProps.trackEvent).toHaveBeenCalledWith('mockEvent');
  });

  it('should log an error if showing the notification fails', async () => {
    (
      NotificationManager.showSimpleNotification as jest.Mock
    ).mockImplementation(() => {
      throw new Error('Failed to show notification');
    });

    await removeEvmToken(mockProps);

    // Ensure Logger is called
    expect(Logger.log).toHaveBeenCalledWith(
      expect.any(Error),
      'Wallet: Failed to hide token!',
    );
  });
});
