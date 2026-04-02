import { buildControllerInitRequestMock } from '../../utils/test-utils';

jest.mock('../../../../lib/Money/feature-flags', () => ({
  isMoneyAccountEnabled: jest.fn(),
}));

const mockIsMoneyAccountEnabled = jest.requireMock(
  '../../../../lib/Money/feature-flags',
).isMoneyAccountEnabled as jest.Mock;
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getKeyringControllerMessenger } from '../../messengers/keyring-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { keyringControllerInit } from './keyring-controller-init';
import {
  KeyringController,
  KeyringControllerMessenger,
} from '@metamask/keyring-controller';
import { MoneyKeyring } from '@metamask/eth-money-keyring';
import { Encryptor } from '../../../Encryptor';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/keyring-controller');
jest.mock('@metamask/eth-money-keyring', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('@metamask/eth-money-keyring');
  return {
    MoneyKeyring: Object.assign(jest.fn(), { type: actual.MoneyKeyring.type }),
  };
});

const mockWithKeyringUnsafe = jest.fn();

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<KeyringControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getKeyringControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  // @ts-expect-error: Partial implementation.
  requestMock.getController.mockImplementation((controllerName: string) => {
    if (controllerName === 'SnapKeyringBuilder') {
      return jest.fn();
    }

    if (controllerName === 'PreferencesController') {
      return jest.fn();
    }

    if (controllerName === 'KeyringController') {
      return { withKeyringUnsafe: mockWithKeyringUnsafe };
    }

    if (controllerName === 'RemoteFeatureFlagController') {
      return { state: { remoteFeatureFlags: {} } };
    }

    throw new Error(`Controller "${controllerName}" not found.`);
  });

  return requestMock;
}

describe('keyringControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMoneyAccountEnabled.mockReturnValue(true);
  });

  it('initializes the controller', () => {
    const { controller } = keyringControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(KeyringController);
  });

  it('passes the proper arguments to the controller', () => {
    keyringControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(KeyringController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      encryptor: expect.any(Encryptor),
      keyringBuilders: expect.any(Array),
    });
  });

  describe('MoneyKeyring builder', () => {
    type KeyringBuilder = (() => unknown) & { type?: string };

    function getMoneyKeyringBuilder(): KeyringBuilder {
      keyringControllerInit(getInitRequestMock());

      const { keyringBuilders } = jest.mocked(KeyringController).mock
        .calls[0][0] as { keyringBuilders: KeyringBuilder[] };

      const builder = keyringBuilders.find((b) => b.type === MoneyKeyring.type);
      if (!builder) {
        throw new Error('MoneyKeyring builder not found');
      }
      return builder;
    }

    it('includes a MoneyKeyring builder when the flag is enabled', () => {
      mockIsMoneyAccountEnabled.mockReturnValue(true);

      const builder = getMoneyKeyringBuilder();

      expect(builder).toBeDefined();
    });

    it('does not include a MoneyKeyring builder when the flag is disabled', () => {
      mockIsMoneyAccountEnabled.mockReturnValue(false);

      keyringControllerInit(getInitRequestMock());

      const { keyringBuilders } = jest.mocked(KeyringController).mock
        .calls[0][0] as { keyringBuilders: (() => unknown)[] };

      const builder = keyringBuilders.find((b) => b.type === MoneyKeyring.type);
      expect(builder).toBeUndefined();
    });

    it('creates a MoneyKeyring instance when invoked', () => {
      const builder = getMoneyKeyringBuilder();

      builder();
      expect(MoneyKeyring).toHaveBeenCalled();
    });

    describe('getMnemonic', () => {
      const mockEntropySource = 'test-entropy-source';

      async function getGetMnemonicFromBuilder() {
        const builder = getMoneyKeyringBuilder();

        // Call the builder so we can extract the getMnemonic callback from the MoneyKeyring
        // constructor args.
        builder();

        const { getMnemonic } = jest.mocked(MoneyKeyring).mock.calls[0][0] as {
          getMnemonic: (entropySource: string) => Promise<number[]>;
        };
        return getMnemonic;
      }

      it('calls KeyringController.withKeyringUnsafe', async () => {
        mockWithKeyringUnsafe.mockResolvedValue([]);

        const getMnemonic = await getGetMnemonicFromBuilder();
        await getMnemonic(mockEntropySource);

        expect(mockWithKeyringUnsafe).toHaveBeenCalledWith(
          expect.objectContaining({ filter: expect.any(Function) }),
          expect.any(Function),
        );
      });

      it('returns encoded mnemonic bytes when keyring has a mnemonic', async () => {
        const fakeMnemonicBytes = new Uint8Array(
          new Uint16Array([0, 1, 2]).buffer,
        );

        mockWithKeyringUnsafe.mockImplementation(
          async (
            _filter: unknown,
            callback: (args: {
              keyring: { mnemonic: Uint8Array };
            }) => Promise<number[]>,
          ) => callback({ keyring: { mnemonic: fakeMnemonicBytes } }),
        );

        const getMnemonic = await getGetMnemonicFromBuilder();
        expect(Array.isArray(await getMnemonic(mockEntropySource))).toBe(true);
      });

      it('throws when the keyring has no mnemonic', async () => {
        mockWithKeyringUnsafe.mockImplementation(
          async (
            _filter: unknown,
            callback: (args: {
              keyring: Record<string, never>;
            }) => Promise<unknown>,
          ) => callback({ keyring: {} }),
        );

        const getMnemonic = await getGetMnemonicFromBuilder();
        await expect(getMnemonic(mockEntropySource)).rejects.toThrow(
          'Unable to get mnemonic to initialize MoneyKeyring',
        );
      });
    });
  });
});
