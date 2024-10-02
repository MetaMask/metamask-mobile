import { KeyringController } from '@metamask/keyring-controller';
import Engine from '@core/Engine';
import DevLogger from '@core/SDKConnect/utils/DevLogger';
import { waitForKeychainUnlocked } from '@core/SDKConnect/utils/wait.util';
import { Connection } from '@core/SDKConnect/Connection';
import handleClientsConnected from './handleClientsConnected';

jest.mock('@core/SDKConnect/Connection');
jest.mock('@metamask/keyring-controller');
jest.mock('@util/Logger');
jest.mock('@core');
jest.mock('@core/SDKConnect/utils/DevLogger');
jest.mock('@core/SDKConnect/utils/wait.util');

describe('handleClientsConnected', () => {
  let mockConnection: Connection;
  const mockSetLoading = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      channelId: 'testChannelId',
      receivedDisconnect: false,
      origin: 'testOrigin',
      setLoading: mockSetLoading,
      _loading: false,
    } as unknown as Connection;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Engine.context = { KeyringController: {} as KeyringController };
  });

  it('should log clients connected event with channel ID and origin', async () => {
    const handleConnected = handleClientsConnected(mockConnection);
    await handleConnected();

    expect(DevLogger.log).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      `Connection::CLIENTS_CONNECTED id=testChannelId receivedDisconnect=false origin=testOrigin`,
    );
  });

  it('should reset receivedDisconnect to false', async () => {
    mockConnection.receivedDisconnect = true;

    const handleConnected = handleClientsConnected(mockConnection);
    await handleConnected();

    expect(mockConnection.receivedDisconnect).toBe(false);
  });

  describe('Keychain unlocking', () => {
    it('should wait for keychain to be unlocked', async () => {
      const handleConnected = handleClientsConnected(mockConnection);
      await handleConnected();

      expect(waitForKeychainUnlocked).toHaveBeenCalledTimes(1);
      expect(waitForKeychainUnlocked).toHaveBeenCalledWith({
        keyringController: Engine.context.KeyringController,
      });
    });
  });
});
