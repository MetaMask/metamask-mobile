import handleReceivedMessage from './handleReceivedMessage';
import { Connection } from '../Connection';
import { CommunicationLayerMessage } from '@metamask/sdk-communication-layer';
import Logger from '../../../../util/Logger';
import Engine from '../../../Engine';
import { handleConnectionMessage } from '../../handlers/handleConnectionMessage';

jest.mock('../Connection');
jest.mock('@metamask/sdk-communication-layer');
jest.mock('../../../../util/Logger');
jest.mock('../../../Engine');
jest.mock('../../handlers/handleConnectionMessage');

describe('handleReceivedMessage', () => {
  let mockConnection: Connection;

  const mockHandleConnectionMessage =
    handleConnectionMessage as jest.MockedFunction<
      typeof handleConnectionMessage
    >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {} as unknown as Connection;
  });

  it('should call handleConnectionMessage with the provided message, engine, and connection instance', async () => {
    const mockMessage = {} as CommunicationLayerMessage;

    await handleReceivedMessage({ instance: mockConnection })(mockMessage);

    expect(mockHandleConnectionMessage).toHaveBeenCalledTimes(1);
    expect(mockHandleConnectionMessage).toHaveBeenCalledWith({
      message: mockMessage,
      engine: Engine,
      connection: mockConnection,
    });
  });

  describe('Error handling', () => {
    it('should log an error if handleConnectionMessage throws an exception', async () => {
      const mockMessage = {} as CommunicationLayerMessage;
      const mockError = new Error('mock error');

      mockHandleConnectionMessage.mockRejectedValueOnce(mockError);

      await expect(
        handleReceivedMessage({ instance: mockConnection })(mockMessage),
      ).rejects.toThrow(mockError);

      expect(Logger.error).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        'Connection not initialized',
      );
    });
  });
});
