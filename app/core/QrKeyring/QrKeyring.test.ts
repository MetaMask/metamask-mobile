import { QrKeyring, QrKeyringBridge } from '@metamask/eth-qr-keyring';
import { withQrKeyring, forgetQrDevice } from './QrKeyring';
import Engine from '../Engine';

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      withKeyring: jest.fn(),
    },
  },
}));

const MockEngine = jest.mocked(Engine);

const mockQrKeyringBridge: QrKeyringBridge = {
  requestScan: jest.fn(),
};

const qrKeyring = new QrKeyring({ bridge: mockQrKeyringBridge });

describe('QrKeyring core', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    MockEngine.context.KeyringController.withKeyring.mockImplementation(
      (_selector, operation) =>
        operation({ keyring: qrKeyring, metadata: { id: '1234', name: '' } }),
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
      MockEngine.context.KeyringController.withKeyring.mockImplementationOnce(
        async (_selector, operation) =>
          operation({
            // The withKeyring helper guards against the keyring controller
            // resolving a non-QR keyring.
            keyring: {} as unknown as QrKeyring,
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
        .mockResolvedValue(
          undefined as unknown as ReturnType<
            QrKeyring['forgetDevice']
          > extends Promise<infer R>
            ? R
            : never,
        );

      await forgetQrDevice();

      expect(forgetDeviceSpy).toHaveBeenCalled();
    });
  });
});
