import { removeEvmToken } from './removeEvmToken';
import Engine from '../../../../core/Engine';
import NotificationManager from '../../../../core/NotificationManager';
import Logger from '../../../../util/Logger';
import { Hex } from '@metamask/utils';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { TokenI } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TokensController: {
      ignoreTokens: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'mockNetworkClientId'),
    },
  },
}));

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
      } as unknown as MetricsEventBuilder),
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

  it('should remove token and track event', async () => {
    await removeEvmToken(mockProps);

    // Check if token is ignored
    expect(Engine.context.TokensController.ignoreTokens).toHaveBeenCalledWith(
      [mockToken.address],
      'mockNetworkClientId',
    );

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

  it('should log an error if removing the token fails', async () => {
    (
      Engine.context.TokensController.ignoreTokens as jest.Mock
    ).mockRejectedValue(new Error('Failed to ignore token'));

    await removeEvmToken(mockProps);

    // Ensure Logger is called
    expect(Logger.log).toHaveBeenCalledWith(
      expect.any(Error),
      'Wallet: Failed to hide token!',
    );
  });
});
