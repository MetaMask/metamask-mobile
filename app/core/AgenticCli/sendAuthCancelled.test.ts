import type { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';
import { sendAuthCancelledToClient } from './sendAuthCancelled';

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

describe('sendAuthCancelledToClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends auth-cancelled payload over MWP', async () => {
    const client = {
      sendResponse: mockSendResponse,
    } as unknown as WalletClient;

    await sendAuthCancelledToClient(client, 'connection-id', 'WebView closed');

    expect(mockSendResponse).toHaveBeenCalledWith({
      type: 'auth-cancelled',
      reason: 'WebView closed',
    });
    expect(mockDebug).toHaveBeenCalledWith(
      'Sending auth cancelled message:',
      'connection-id',
      { reason: 'WebView closed' },
    );
  });

  it('omits reason when not provided', async () => {
    const client = {
      sendResponse: mockSendResponse,
    } as unknown as WalletClient;

    await sendAuthCancelledToClient(client, 'connection-id');

    expect(mockSendResponse).toHaveBeenCalledWith({
      type: 'auth-cancelled',
    });
  });
});
