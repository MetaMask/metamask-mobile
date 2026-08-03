import type { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';
import {
  PAIRING_CANCELLED_TYPE,
  sendPairingCancelledToClient,
} from './sendPairingCancelled';

const mockSendResponse = jest.fn().mockResolvedValue(undefined);
const mockDebug = jest.fn();

jest.mock('../SDKConnectV2/services/logger', () => ({
  __esModule: true,
  default: {
    debug: (...args: unknown[]) => mockDebug(...args),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('sendPairingCancelledToClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends pairing-cancelled payload over MWP', async () => {
    const client = {
      sendResponse: mockSendResponse,
    } as unknown as WalletClient;

    await sendPairingCancelledToClient(client, 'connection-id');

    expect(mockSendResponse).toHaveBeenCalledWith({
      type: PAIRING_CANCELLED_TYPE,
    });
    expect(mockDebug).toHaveBeenCalledWith(
      'Sending pairing-cancelled message:',
      'connection-id',
    );
  });
});
