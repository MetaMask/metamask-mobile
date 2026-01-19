import { HandlerType } from '@metamask/snaps-utils';
import { signTronRewardsMessage } from './tron-snap';
import { handleSnapRequest } from '../../../../Snaps/utils';
import { TRON_WALLET_SNAP_ID } from '../../../../SnapKeyring/TronWalletSnap';
import Engine from '../../../../Engine';
import Logger from '../../../../../util/Logger';

jest.mock('../../../../Snaps/utils', () => ({
  handleSnapRequest: jest.fn(),
}));

jest.mock('../../../../Engine', () => ({
  controllerMessenger: {},
}));

jest.mock('../../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('tron-snap', () => {
  const mockAccountId = 'tron-account-id';
  const mockMessage = 'base64-encoded-message';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signTronRewardsMessage', () => {
    it('should successfully sign a Tron rewards message', async () => {
      const mockResult = {
        signature: '0xabcdef123456',
        signedMessage: 'test',
        signatureType: 'ecdsa',
      };

      (handleSnapRequest as jest.Mock).mockResolvedValue(mockResult);

      const result = await signTronRewardsMessage(mockAccountId, mockMessage);

      expect(handleSnapRequest).toHaveBeenCalledWith(
        Engine.controllerMessenger,
        {
          origin: 'metamask',
          snapId: TRON_WALLET_SNAP_ID,
          handler: HandlerType.OnClientRequest,
          request: {
            jsonrpc: '2.0',
            id: expect.any(Number),
            method: 'signRewardsMessage',
            params: {
              accountId: mockAccountId,
              message: mockMessage,
            },
          },
        },
      );

      expect(result).toEqual(mockResult);
    });

    it('should handle errors when signing fails', async () => {
      const mockError = new Error('Signing failed');
      (handleSnapRequest as jest.Mock).mockRejectedValue(mockError);

      await expect(
        signTronRewardsMessage(mockAccountId, mockMessage),
      ).rejects.toThrow('Signing failed');

      expect(Logger.log).toHaveBeenCalledWith(
        'Error signing Tron rewards message:',
        mockError,
      );
    });

    it('should handle errors from handleSnapRequest', async () => {
      const mockError = new Error('Snap request failed');
      (handleSnapRequest as jest.Mock).mockRejectedValue(mockError);

      await expect(
        signTronRewardsMessage(mockAccountId, mockMessage),
      ).rejects.toThrow('Snap request failed');

      expect(Logger.log).toHaveBeenCalledWith(
        'Error signing Tron rewards message:',
        mockError,
      );
    });

    it('should use correct snap ID', async () => {
      const mockResult = {
        signature: '0x123',
        signedMessage: 'test',
        signatureType: 'ecdsa',
      };

      (handleSnapRequest as jest.Mock).mockResolvedValue(mockResult);

      await signTronRewardsMessage(mockAccountId, mockMessage);

      expect(handleSnapRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          snapId: TRON_WALLET_SNAP_ID,
        }),
      );
    });

    it('should pass correct accountId and message', async () => {
      const mockResult = {
        signature: '0x123',
        signedMessage: 'test',
        signatureType: 'ecdsa',
      };

      (handleSnapRequest as jest.Mock).mockResolvedValue(mockResult);

      await signTronRewardsMessage(mockAccountId, mockMessage);

      expect(handleSnapRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          request: expect.objectContaining({
            params: {
              accountId: mockAccountId,
              message: mockMessage,
            },
          }),
        }),
      );
    });

    it('should handle empty accountId', async () => {
      const mockResult = {
        signature: '0x123',
        signedMessage: 'test',
        signatureType: 'ecdsa',
      };

      (handleSnapRequest as jest.Mock).mockResolvedValue(mockResult);

      const result = await signTronRewardsMessage('', mockMessage);

      expect(result).toEqual(mockResult);
    });

    it('should handle empty message', async () => {
      const mockResult = {
        signature: '0x123',
        signedMessage: 'test',
        signatureType: 'ecdsa',
      };

      (handleSnapRequest as jest.Mock).mockResolvedValue(mockResult);

      const result = await signTronRewardsMessage(mockAccountId, '');

      expect(result).toEqual(mockResult);
    });
  });
});
