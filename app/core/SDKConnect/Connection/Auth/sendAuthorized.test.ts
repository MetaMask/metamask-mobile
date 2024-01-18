import { MessageType } from '@metamask/sdk-communication-layer';
import { Connection } from '../Connection';
import sendAuthorized from './sendAuthorized';

jest.mock('../Connection');
jest.mock('@metamask/sdk-communication-layer');
jest.mock('../../../../util/Logger');

describe('sendAuthorized', () => {
  let mockConnection: Connection;
  const mockSendMessage = jest.fn(() => new Promise((resolve) => resolve('')));

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      remote: {
        sendMessage: mockSendMessage,
      },
      authorizedSent: false,
    } as unknown as Connection;
  });

  it('should send an AUTHORIZED message if not already sent', () => {
    sendAuthorized({ instance: mockConnection });

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: MessageType.AUTHORIZED,
    });
  });

  it('should set authorizedSent to true after sending AUTHORIZED message', async () => {
    await sendAuthorized({ instance: mockConnection, force: true });

    expect(mockConnection.authorizedSent).toBe(true);
  });

  describe('Handling force parameter', () => {
    it('should send AUTHORIZED message even if already sent when force is true', () => {
      mockConnection.authorizedSent = true;

      sendAuthorized({ instance: mockConnection, force: true });

      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: MessageType.AUTHORIZED,
      });
    });

    it('should not send AUTHORIZED message if already sent and force is not true', () => {
      mockConnection.authorizedSent = true;

      sendAuthorized({ instance: mockConnection, force: false });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });
});
