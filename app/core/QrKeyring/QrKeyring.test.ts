import {
  QrKeyring as LegacyQrKeyring,
  QrKeyringBridge,
} from '@metamask/eth-qr-keyring';
import { QrKeyring } from '@metamask/eth-qr-keyring/v2';
import type { Keyring } from '@metamask/keyring-api/v2';
import type { RestrictedController } from '@metamask/keyring-controller';
import { withQrKeyring, forgetQrDevice } from './QrKeyring';
import Engine from '../Engine';

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            type: 'QR Hardware Wallet Device',
            accounts: [],
            metadata: { id: 'qr', name: 'QR Hardware Wallet Device' },
          },
        ],
      },
      addNewKeyring: jest.fn(),
      withController: jest.fn(),
      withKeyringV2: jest.fn(),
    },
  },
}));

const MockEngine = jest.mocked(Engine);
const mockRestrictedAddNewQrKeyring = jest.fn();

const mockQrKeyringBridge: QrKeyringBridge = {
  requestScan: jest.fn(),
};

const legacyQrKeyring = new LegacyQrKeyring({ bridge: mockQrKeyringBridge });
const qrKeyring = new QrKeyring({
  legacyKeyring: legacyQrKeyring,
  entropySource: 'test-entropy-source',
});

function createRestrictedControllerMock(
  keyringController: typeof MockEngine.context.KeyringController,
): RestrictedController {
  const restrictedKeyrings = keyringController.state.keyrings.map(
    ({ type }) => ({
      keyring: { type },
      metadata: { id: type, name: type },
    }),
  );

  return {
    get keyrings() {
      return restrictedKeyrings;
    },
    addNewKeyring: async (type: string) => {
      mockRestrictedAddNewQrKeyring(type);
      const entry = {
        keyring: { type },
        metadata: { id: type, name: type },
      };
      restrictedKeyrings.push(entry);
      keyringController.state.keyrings.push({
        type,
        accounts: [],
        metadata: { id: type, name: type },
      });
      return entry;
    },
    removeKeyring: jest.fn(),
  } as unknown as RestrictedController;
}

describe('QrKeyring core', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    const mockKeyringController = MockEngine.context.KeyringController;
    mockKeyringController.state.keyrings = [
      {
        type: LegacyQrKeyring.type,
        accounts: [],
        metadata: { id: 'qr', name: LegacyQrKeyring.type },
      },
    ];

    MockEngine.context.KeyringController.withKeyringV2.mockImplementation(
      (_selector, operation) =>
        operation({
          keyring: qrKeyring as unknown as Keyring,
          metadata: { id: '1234', name: '' },
        }),
    );
    let withControllerQueue = Promise.resolve();
    mockKeyringController.withController.mockImplementation((operation) => {
      const runOperation = () =>
        operation(createRestrictedControllerMock(mockKeyringController));
      const result = withControllerQueue.then(runOperation, runOperation);
      withControllerQueue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    });
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

    it('creates the QR keyring on-demand when none exists yet', async () => {
      MockEngine.context.KeyringController.state.keyrings = [];

      await withQrKeyring(async () => undefined);

      expect(mockRestrictedAddNewQrKeyring).toHaveBeenCalledWith(
        LegacyQrKeyring.type,
      );
    });

    it('creates only one QR keyring for concurrent callers', async () => {
      MockEngine.context.KeyringController.state.keyrings = [];

      await Promise.all([
        withQrKeyring(async () => undefined),
        withQrKeyring(async () => undefined),
      ]);

      expect(mockRestrictedAddNewQrKeyring).toHaveBeenCalledTimes(1);
      expect(mockRestrictedAddNewQrKeyring).toHaveBeenCalledWith(
        LegacyQrKeyring.type,
      );
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
