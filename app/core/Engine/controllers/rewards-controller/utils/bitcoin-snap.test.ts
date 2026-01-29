import { HandlerType } from '@metamask/snaps-utils';
import { signBitcoinRewardsMessage } from './bitcoin-snap';
import { handleSnapRequest } from '../../../../Snaps/utils';
import { BITCOIN_WALLET_SNAP_ID } from '../../../../SnapKeyring/BitcoinWalletSnap';
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

describe('bitcoin-snap', () => {
  const mockAccountId = 'bitcoin-account-id';
  const mockMessage = 'base64-encoded-message';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signBitcoinRewardsMessage', () => {
    it('successfully signs a Bitcoin rewards message', async () => {
      const mockResult = {
        signature: '0xabcdef123456',
        signedMessage: 'test',
        signatureType: 'ecdsa',
      };

      (handleSnapRequest as jest.Mock).mockResolvedValue(mockResult);

      const result = await signBitcoinRewardsMessage(
        mockAccountId,
        mockMessage,
      );

      expect(handleSnapRequest).toHaveBeenCalledWith(
        Engine.controllerMessenger,
        {
          origin: 'metamask',
          snapId: BITCOIN_WALLET_SNAP_ID,
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

    it('handles errors when signing fails', async () => {
      const mockError = new Error('Signing failed');
      (handleSnapRequest as jest.Mock).mockRejectedValue(mockError);

      await expect(
        signBitcoinRewardsMessage(mockAccountId, mockMessage),
      ).rejects.toThrow('Signing failed');

      expect(Logger.log).toHaveBeenCalledWith(
        'Error signing Bitcoin rewards message:',
        mockError,
      );
    });

    it('handles errors from handleSnapRequest', async () => {
      const mockError = new Error('Snap request failed');
      (handleSnapRequest as jest.Mock).mockRejectedValue(mockError);

      await expect(
        signBitcoinRewardsMessage(mockAccountId, mockMessage),
      ).rejects.toThrow('Snap request failed');

      expect(Logger.log).toHaveBeenCalledWith(
        'Error signing Bitcoin rewards message:',
        mockError,
      );
    });

    it('uses correct snap ID', async () => {
      const mockResult = {
        signature: '0x123',
        signedMessage: 'test',
        signatureType: 'ecdsa',
      };

      (handleSnapRequest as jest.Mock).mockResolvedValue(mockResult);

      await signBitcoinRewardsMessage(mockAccountId, mockMessage);

      expect(handleSnapRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          snapId: BITCOIN_WALLET_SNAP_ID,
        }),
      );
    });

    it('passes correct accountId and message', async () => {
      const mockResult = {
        signature: '0x123',
        signedMessage: 'test',
        signatureType: 'ecdsa',
      };

      (handleSnapRequest as jest.Mock).mockResolvedValue(mockResult);

      await signBitcoinRewardsMessage(mockAccountId, mockMessage);

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

    it('handles empty accountId', async () => {
      const mockResult = {
        signature: '0x123',
        signedMessage: 'test',
        signatureType: 'ecdsa',
      };

      (handleSnapRequest as jest.Mock).mockResolvedValue(mockResult);

      const result = await signBitcoinRewardsMessage('', mockMessage);

      expect(result).toEqual(mockResult);
    });

    it('handles empty message', async () => {
      const mockResult = {
        signature: '0x123',
        signedMessage: 'test',
        signatureType: 'ecdsa',
      };

      (handleSnapRequest as jest.Mock).mockResolvedValue(mockResult);

      const result = await signBitcoinRewardsMessage(mockAccountId, '');

      expect(result).toEqual(mockResult);
    });
  });
});
