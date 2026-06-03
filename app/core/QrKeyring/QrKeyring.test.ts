import {
  QrKeyring as LegacyQrKeyring,
  QrKeyringBridge,
} from '@metamask/eth-qr-keyring';
import { QrKeyring } from '@metamask/eth-qr-keyring/v2';
import type { Keyring } from '@metamask/keyring-api/v2';
import { withQrKeyring, forgetQrDevice } from './QrKeyring';
import Engine from '../Engine';

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [{ type: 'QR Hardware Wallet Device', accounts: [] }],
      },
      addNewKeyring: jest.fn(),
      withKeyringV2: jest.fn(),
    },
  },
}));

const MockEngine = jest.mocked(Engine);

const mockQrKeyringBridge: QrKeyringBridge = {
  requestScan: jest.fn(),
};

const legacyQrKeyring = new LegacyQrKeyring({ bridge: mockQrKeyringBridge });
const qrKeyring = new QrKeyring({
  legacyKeyring: legacyQrKeyring,
  entropySource: 'test-entropy-source',
});

describe('QrKeyring core', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    MockEngine.context.KeyringController.withKeyringV2.mockImplementation(
      (_selector, operation) =>
        operation({
          keyring: qrKeyring as unknown as Keyring,
          metadata: { id: '1234', name: '' },
        }),
    );
  });

  describe('withQrKeyring', () => {
    it('passes the QrKeyring to the operation and returns its result', async () => {
      const operation = jest.fn().mockResolvedValue('done');

      const result = await withQrKeyring(operation);

      expect(operation).toHaveBeenCalledWith(
        expect.objectContaining({ keyring: qrKeyring }),
      );
      expect(result).toBe('done');
    });

    it('throws when the resolved keyring is not a QrKeyring instance', async () => {
      MockEngine.context.KeyringController.withKeyringV2.mockImplementationOnce(
        async (_selector, operation) =>
          operation({
            keyring: {} as unknown as Keyring,
            metadata: { id: '1234', name: '' },
          }),
      );

      await expect(withQrKeyring(async () => 'unreachable')).rejects.toThrow(
        'Expected QrKeyring',
      );
    });
  });

  describe('forgetQrDevice', () => {
    it('calls keyring.forgetDevice', async () => {
      const forgetDeviceSpy = jest
        .spyOn(qrKeyring, 'forgetDevice')
        .mockResolvedValue();

      await forgetQrDevice();

      expect(forgetDeviceSpy).toHaveBeenCalled();
    });
  });
});
