import {
  signSolanaRewardsMessage,
  SignRewardsMessageResult,
} from './solana-snap';
import { handleSnapRequest } from '../../../../Snaps/utils';
import Engine from '../../../../Engine';
import { SOLANA_WALLET_SNAP_ID } from '../../../../SnapKeyring/SolanaWalletSnap';
import { HandlerType } from '@metamask/snaps-utils';

// Mock dependencies
jest.mock('../../../../Snaps/utils', () => ({
  handleSnapRequest: jest.fn(),
}));

jest.mock('../../../../Engine', () => ({
  controllerMessenger: {},
}));

jest.mock('../../../../SnapKeyring/SolanaWalletSnap', () => ({
  SOLANA_WALLET_SNAP_ID: 'npm:@metamask/solana-wallet-snap',
}));

// Mock console.error to avoid test noise
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('solana-snap', () => {
  const mockAddress = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
  const mockMessage = 'Test message for signing';
  const mockSignatureResult: SignRewardsMessageResult = {
    signature: 'mockSignature123',
    signedMessage: 'mockSignedMessage',
    signatureType: 'ed25519',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console.error mock calls
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('signSolanaRewardsMessage', () => {
    it('successfully signs a Solana rewards message', async () => {
      // Arrange
      (handleSnapRequest as jest.Mock).mockResolvedValueOnce(
        mockSignatureResult,
      );

      // Act
      const result = await signSolanaRewardsMessage(mockAddress, mockMessage);

      // Assert
      expect(result).toEqual(mockSignatureResult);
      expect(handleSnapRequest).toHaveBeenCalledTimes(1);
      expect(handleSnapRequest).toHaveBeenCalledWith(
        Engine.controllerMessenger,
        {
          origin: 'metamask',
          snapId: SOLANA_WALLET_SNAP_ID,
          handler: HandlerType.OnClientRequest,
          request: {
            jsonrpc: '2.0',
            id: expect.any(Number),
            method: 'signRewardsMessage',
            params: {
              account: {
                address: mockAddress,
              },
              message: mockMessage,
            },
          },
        },
      );
    });

    it('passes correct parameters to handleSnapRequest', async () => {
      // Arrange
      const expectedTimestamp = Date.now();
      jest.spyOn(Date, 'now').mockReturnValueOnce(expectedTimestamp);
      (handleSnapRequest as jest.Mock).mockResolvedValueOnce(
        mockSignatureResult,
      );

      // Act
      await signSolanaRewardsMessage(mockAddress, mockMessage);

      // Assert
      expect(handleSnapRequest).toHaveBeenCalledWith(
        Engine.controllerMessenger,
        expect.objectContaining({
          origin: 'metamask',
          snapId: 'npm:@metamask/solana-wallet-snap',
          handler: HandlerType.OnClientRequest,
          request: expect.objectContaining({
            jsonrpc: '2.0',
            id: expectedTimestamp,
            method: 'signRewardsMessage',
            params: {
              account: {
                address: mockAddress,
              },
              message: mockMessage,
            },
          }),
        }),
      );
    });

    it('handles network timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Network timeout');
      (handleSnapRequest as jest.Mock).mockRejectedValueOnce(timeoutError);

      // Act & Assert
      await expect(
        signSolanaRewardsMessage(mockAddress, mockMessage),
      ).rejects.toThrow('Network timeout');
    });

    it('handles snap not available error', async () => {
      // Arrange
      const snapError = new Error('Snap not found');
      (handleSnapRequest as jest.Mock).mockRejectedValueOnce(snapError);

      // Act & Assert
      await expect(
        signSolanaRewardsMessage(mockAddress, mockMessage),
      ).rejects.toThrow('Snap not found');
    });

    it('generates unique request IDs for concurrent calls', async () => {
      // Arrange
      const firstTimestamp = 1000;
      const secondTimestamp = 2000;
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(firstTimestamp)
        .mockReturnValueOnce(secondTimestamp);

      (handleSnapRequest as jest.Mock)
        .mockResolvedValueOnce(mockSignatureResult)
        .mockResolvedValueOnce(mockSignatureResult);

      // Act
      const [result1, result2] = await Promise.all([
        signSolanaRewardsMessage(mockAddress, mockMessage),
        signSolanaRewardsMessage(mockAddress, 'Different message'),
      ]);

      // Assert
      expect(result1).toEqual(mockSignatureResult);
      expect(result2).toEqual(mockSignatureResult);
      expect(handleSnapRequest).toHaveBeenCalledTimes(2);

      // Verify different request IDs were used
      const firstCall = (handleSnapRequest as jest.Mock).mock.calls[0];
      const secondCall = (handleSnapRequest as jest.Mock).mock.calls[1];
      expect(firstCall[1].request.id).toBe(firstTimestamp);
      expect(secondCall[1].request.id).toBe(secondTimestamp);
    });

    it('handles empty address parameter', async () => {
      // Arrange
      (handleSnapRequest as jest.Mock).mockResolvedValueOnce(
        mockSignatureResult,
      );

      // Act
      const result = await signSolanaRewardsMessage('', mockMessage);

      // Assert
      expect(result).toEqual(mockSignatureResult);
      expect(handleSnapRequest).toHaveBeenCalledWith(
        Engine.controllerMessenger,
        expect.objectContaining({
          request: expect.objectContaining({
            params: {
              account: {
                address: '',
              },
              message: mockMessage,
            },
          }),
        }),
      );
    });

    it('handles empty message parameter', async () => {
      // Arrange
      (handleSnapRequest as jest.Mock).mockResolvedValueOnce(
        mockSignatureResult,
      );

      // Act
      const result = await signSolanaRewardsMessage(mockAddress, '');

      // Assert
      expect(result).toEqual(mockSignatureResult);
      expect(handleSnapRequest).toHaveBeenCalledWith(
        Engine.controllerMessenger,
        expect.objectContaining({
          request: expect.objectContaining({
            params: {
              account: {
                address: mockAddress,
              },
              message: '',
            },
          }),
        }),
      );
    });
  });
});
