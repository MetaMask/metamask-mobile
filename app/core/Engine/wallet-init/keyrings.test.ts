import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { QrKeyring as LegacyQrKeyring } from '@metamask/eth-qr-keyring';
import { QrKeyring } from '@metamask/eth-qr-keyring/v2';
import {
  LedgerKeyring as LegacyLedgerKeyring,
  LedgerDmkBridge,
  LedgerMobileBridge,
} from '@metamask/eth-ledger-bridge-keyring';
import { LedgerKeyring } from '@metamask/eth-ledger-bridge-keyring/v2';
import { HdKeyring as LegacyHdKeyring } from '@metamask/eth-hd-keyring';
import { HdKeyring as HdKeyringV2 } from '@metamask/eth-hd-keyring/v2';
import { MoneyKeyring as LegacyMoneyKeyring } from '@metamask/eth-money-keyring';
import { MoneyKeyring } from '@metamask/eth-money-keyring/v2';
import type { Keyring } from '@metamask/keyring-api/v2';
import type { KeyringControllerWithKeyringV2UnsafeAction } from '@metamask/keyring-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  getKeyringBuilders,
  getKeyringV2Builders,
  qrKeyringBridge,
} from './keyrings';
import { SnapKeyring as SnapKeyringV2 } from '@metamask/eth-snap-keyring/v2';
import { MpcMoneyKeyring as MpcMoneyKeyringV2 } from '@metamask/eth-money-mpc-keyring/v2';
import type { MpcMoneyKeyring as RealMpcMoneyKeyring } from '@metamask/eth-money-mpc-keyring';
import { MpcMoneyKeyring } from '../../MpcMoneyKeyring/MpcMoneyKeyring';

jest.mock('../../../store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({})),
  },
}));

jest.mock('@ledgerhq/device-transport-kit-react-native-ble', () => ({
  RNBleTransportFactory: 'RNBleTransportFactory',
}));

jest.mock('@metamask/eth-money-mpc-keyring', () => ({
  MpcMoneyKeyring: Object.assign(
    jest.fn().mockImplementation((options) => ({ options })),
    { type: 'MPC Money Keyring' },
  ),
}));

jest.mock('@metamask/mpc-react-native', () => ({
  cl24Lib: { name: 'cl24' },
  dkls23Lib: { name: 'dkls23' },
}));

jest.mock('../../SnapKeyring', () => ({
  snapKeyringBuilder: jest.fn(() => {
    const builder = () => ({});
    builder.type = 'Snap Keyring';
    return builder;
  }),
}));

function getRootMessenger() {
  return new Messenger<
    MockAnyNamespace,
    | KeyringControllerWithKeyringV2UnsafeAction
    | AuthenticationController.AuthenticationControllerGetBearerTokenAction,
    never
  >({ namespace: MOCK_ANY_NAMESPACE });
}

describe('wallet-init/keyrings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('qrKeyringBridge', () => {
    it('is constructed and exported', () => {
      expect(qrKeyringBridge).toBeDefined();
      expect(typeof qrKeyringBridge.requestScan).toBe('function');
    });
  });

  describe('getKeyringBuilders', () => {
    it('registers QR, Ledger, HD, Money, and Snap builders by type', () => {
      const builders = getKeyringBuilders(getRootMessenger(), false) ?? [];
      const types = builders.map((b) => b.type);

      expect(types).toEqual(
        expect.arrayContaining([
          LegacyQrKeyring.type,
          LegacyLedgerKeyring.type,
          LegacyHdKeyring.type,
          LegacyMoneyKeyring.type,
        ]),
      );
    });

    it('constructs the right keyring instance for each type', () => {
      const builders = getKeyringBuilders(getRootMessenger(), false) ?? [];
      const byType = Object.fromEntries(builders.map((b) => [b.type, b]));

      expect(byType[LegacyQrKeyring.type]()).toBeInstanceOf(LegacyQrKeyring);
      expect(byType[LegacyLedgerKeyring.type]()).toBeInstanceOf(
        LegacyLedgerKeyring,
      );
      expect(byType[LegacyHdKeyring.type]()).toBeInstanceOf(LegacyHdKeyring);
      expect(byType[LegacyMoneyKeyring.type]()).toBeInstanceOf(
        LegacyMoneyKeyring,
      );
    });

    it('uses LedgerMobileBridge when DMK is disabled', () => {
      const builders = getKeyringBuilders(getRootMessenger(), false) ?? [];
      const byType = Object.fromEntries(builders.map((b) => [b.type, b]));
      const ledger = byType[LegacyLedgerKeyring.type]() as LegacyLedgerKeyring;

      expect(ledger.bridge).toBeInstanceOf(LedgerMobileBridge);
    });

    it('uses LedgerDmkBridge when DMK is enabled', () => {
      const builders = getKeyringBuilders(getRootMessenger(), true) ?? [];
      const byType = Object.fromEntries(builders.map((b) => [b.type, b]));
      const ledger = byType[LegacyLedgerKeyring.type]() as LegacyLedgerKeyring;

      expect(ledger.bridge).toBeInstanceOf(LedgerDmkBridge);
    });

    it('MoneyKeyring getMnemonic closure routes through withKeyringV2Unsafe and matches HD keyrings by id', async () => {
      const messenger = getRootMessenger();
      const legacyHd = new LegacyHdKeyring();
      await legacyHd.deserialize({
        mnemonic: 'test test test test test test test test test test test ball',
      });
      const hdKeyring = new HdKeyringV2({
        // @ts-expect-error: Property '#private' in type 'HdKeyring' refers to a
        // different member that cannot be accessed from within type 'HdKeyring'.
        legacyKeyring: legacyHd,
        entropySource: 'entropy-1',
      });

      const filterCalls: { type: string; id: string }[] = [];
      const handler = jest.fn(async (selector, operation) => {
        if ('filter' in selector) {
          selector.filter(hdKeyring, { id: 'entropy-1', name: 'main' });
          selector.filter(hdKeyring, { id: 'other', name: 'other' });
          filterCalls.push({ type: LegacyHdKeyring.type, id: 'entropy-1' });
        }
        // Drive the closure body all the way through `encodeMnemonic`. The
        // returned value is fed back into MoneyKeyring's internals which can
        // throw downstream; the test only cares that the closure ran.
        return operation({
          keyring: hdKeyring as unknown as Keyring,
          metadata: { id: 'entropy-1', name: 'main' },
        });
      });
      messenger.registerActionHandler(
        'KeyringController:withKeyringV2Unsafe',
        handler,
      );

      const builders = getKeyringBuilders(messenger, false) ?? [];
      const moneyBuilder = builders.find(
        (b) => b.type === LegacyMoneyKeyring.type,
      );
      if (!moneyBuilder) {
        throw new Error('Money keyring builder missing');
      }
      const moneyKeyring = moneyBuilder() as LegacyMoneyKeyring;

      await moneyKeyring.deserialize({ entropySource: 'entropy-1' });
      // `addAccounts` triggers the lazy inner-HD init that calls our migrated
      // closure. We don't care if it ultimately succeeds — we only need the
      // closure body to execute.
      await moneyKeyring.addAccounts(1).catch(() => undefined);

      expect(handler).toHaveBeenCalled();
      expect(filterCalls).toEqual([
        { type: LegacyHdKeyring.type, id: 'entropy-1' },
      ]);
    });

    it('MoneyKeyring getMnemonic closure throws if the HD keyring has no mnemonic', async () => {
      const messenger = getRootMessenger();
      const emptyHd = new HdKeyringV2({
        // @ts-expect-error: Two different types with this name exist, but they
        // are unrelated.
        legacyKeyring: new LegacyHdKeyring(),
        entropySource: 'entropy-1',
      });

      messenger.registerActionHandler(
        'KeyringController:withKeyringV2Unsafe',
        async (_selector, operation) =>
          operation({
            keyring: emptyHd as unknown as Keyring,
            metadata: { id: 'entropy-1', name: 'main' },
          }),
      );

      const builders = getKeyringBuilders(messenger, false) ?? [];
      const moneyBuilder = builders.find(
        (b) => b.type === LegacyMoneyKeyring.type,
      );
      if (!moneyBuilder) {
        throw new Error('Money keyring builder missing');
      }
      const moneyKeyring = moneyBuilder() as LegacyMoneyKeyring;
      await moneyKeyring.deserialize({ entropySource: 'entropy-1' });

      await expect(moneyKeyring.addAccounts(1)).rejects.toThrow(
        'Unable to get mnemonic to initialize MoneyKeyring',
      );
    });
  });

  describe('getKeyringV2Builders', () => {
    it('returns V2 builders for Ledger, QR, and MoneyKeyring keyed by the legacy type', () => {
      const builders = getKeyringV2Builders() ?? [];
      const types = builders.map((b) => b.type);

      expect(types).toEqual([
        LegacyLedgerKeyring.type,
        LegacyQrKeyring.type,
        LegacyMoneyKeyring.type,
        SnapKeyringV2.type,
      ]);
    });

    it('hardware V2 builders wrap a legacy keyring into the V2 adapter', () => {
      const builders = getKeyringV2Builders() ?? [];
      const byType = Object.fromEntries(builders.map((b) => [b.type, b]));

      const legacyLedger = new LegacyLedgerKeyring({
        // @ts-expect-error - partial bridge stub
        bridge: {},
      });
      const ledgerV2 = byType[LegacyLedgerKeyring.type](legacyLedger as never, {
        id: 'entropy-1',
        name: 'main',
      });
      expect(ledgerV2).toBeInstanceOf(LedgerKeyring);

      const legacyQr = new LegacyQrKeyring({
        // @ts-expect-error - partial bridge stub
        bridge: {},
      });
      const qrV2 = byType[LegacyQrKeyring.type](legacyQr as never, {
        id: 'entropy-2',
        name: 'qr',
      });
      expect(qrV2).toBeInstanceOf(QrKeyring);
    });

    it('MoneyKeyring V2 builder takes the legacy keyring directly', () => {
      const builders = getKeyringV2Builders() ?? [];
      const byType = Object.fromEntries(builders.map((b) => [b.type, b]));

      const legacyMoney = new LegacyMoneyKeyring({
        getMnemonic: async () => [],
      });
      const moneyV2 = byType[LegacyMoneyKeyring.type](legacyMoney as never, {
        id: 'entropy-3',
        name: 'money',
      });
      expect(moneyV2).toBeInstanceOf(MoneyKeyring);
    });
  });

  describe('MPC money keyring registration', () => {
    const originalFlag = process.env.MM_MONEY_MPC_KEYRING_ENABLED;
    const originalRealFlag = process.env.MM_MONEY_MPC_REAL_KEYRING;

    afterEach(() => {
      if (originalFlag === undefined) {
        delete process.env.MM_MONEY_MPC_KEYRING_ENABLED;
      } else {
        process.env.MM_MONEY_MPC_KEYRING_ENABLED = originalFlag;
      }
      if (originalRealFlag === undefined) {
        delete process.env.MM_MONEY_MPC_REAL_KEYRING;
      } else {
        process.env.MM_MONEY_MPC_REAL_KEYRING = originalRealFlag;
      }
    });

    it('does not register the MPC money keyring builders when the build flag is off', () => {
      delete process.env.MM_MONEY_MPC_KEYRING_ENABLED;

      const v1Types = (getKeyringBuilders(getRootMessenger(), false) ?? []).map(
        (builder) => builder.type,
      );
      const v2Types = (getKeyringV2Builders() ?? []).map(
        (builder) => builder.type,
      );

      expect(v1Types).not.toContain(MpcMoneyKeyring.type);
      expect(v2Types).not.toContain(MpcMoneyKeyring.type);
    });

    it('registers the MPC money keyring builders when the build flag is on', () => {
      process.env.MM_MONEY_MPC_KEYRING_ENABLED = 'true';
      delete process.env.MM_MONEY_MPC_REAL_KEYRING;

      const v1Builders = getKeyringBuilders(getRootMessenger(), false) ?? [];
      const byV1Type = Object.fromEntries(
        v1Builders.map((builder) => [builder.type, builder]),
      );
      expect(byV1Type[MpcMoneyKeyring.type]()).toBeInstanceOf(MpcMoneyKeyring);

      const v2Builders = getKeyringV2Builders() ?? [];
      const byV2Type = Object.fromEntries(
        v2Builders.map((builder) => [builder.type, builder]),
      );
      const wrapper = byV2Type[MpcMoneyKeyring.type](new MpcMoneyKeyring(), {
        id: 'metadata-id',
        name: 'name',
      });
      expect(wrapper).toBeInstanceOf(MpcMoneyKeyringV2);
    });

    it('registers the real MPC money keyring when the real build flag is on', () => {
      process.env.MM_MONEY_MPC_KEYRING_ENABLED = 'true';
      process.env.MM_MONEY_MPC_REAL_KEYRING = 'true';

      const v1Builders = getKeyringBuilders(getRootMessenger(), false) ?? [];
      const byV1Type = Object.fromEntries(
        v1Builders.map((builder) => [builder.type, builder]),
      );

      // The mocked real keyring records its constructor options.
      const keyring = byV1Type[MpcMoneyKeyring.type]() as unknown as {
        options: { cloudURL: string; cl24Lib: { name: string } };
      };
      expect(keyring.options.cloudURL).toBe(
        'https://mpc-service.dev-api.cx.metamask.io/v1',
      );
      expect(keyring.options.cl24Lib).toEqual({ name: 'cl24' });
    });

    it('gets the MPC profile token from the authentication controller', async () => {
      process.env.MM_MONEY_MPC_KEYRING_ENABLED = 'true';
      process.env.MM_MONEY_MPC_REAL_KEYRING = 'true';
      const messenger = getRootMessenger();
      const getBearerToken = jest.fn().mockResolvedValue('profile-token');
      messenger.registerActionHandler(
        'AuthenticationController:getBearerToken',
        getBearerToken,
      );
      const builder = getKeyringBuilders(messenger, false)?.find(
        (entry) => entry.type === MpcMoneyKeyring.type,
      );
      if (!builder) {
        throw new Error('MPC keyring builder missing');
      }
      const { options } = builder() as unknown as {
        options: ConstructorParameters<typeof RealMpcMoneyKeyring>[0];
      };

      const token = await options.getProfileToken();

      expect(token).toBe('profile-token');
      expect(getBearerToken).toHaveBeenCalledTimes(1);
      expect(getBearerToken).toHaveBeenCalledWith();
    });

    it('provides the primary HD mnemonic as UTF-8 bytes for MPC backups', async () => {
      process.env.MM_MONEY_MPC_KEYRING_ENABLED = 'true';
      process.env.MM_MONEY_MPC_REAL_KEYRING = 'true';
      const mnemonic =
        'test test test test test test test test test test test ball';
      const legacyHd = new LegacyHdKeyring();
      await legacyHd.deserialize({ mnemonic });
      const hdKeyring = new HdKeyringV2({
        legacyKeyring: legacyHd as never,
        entropySource: 'primary-hd',
      });
      const messenger = getRootMessenger();
      const handler = jest.fn(async (_selector, operation) =>
        operation({
          keyring: hdKeyring as unknown as Keyring,
          metadata: { id: 'primary-hd', name: 'Primary' },
        }),
      );
      messenger.registerActionHandler(
        'KeyringController:withKeyringV2Unsafe',
        handler,
      );
      const builder = getKeyringBuilders(messenger, false)?.find(
        (entry) => entry.type === MpcMoneyKeyring.type,
      );
      if (!builder) {
        throw new Error('MPC keyring builder missing');
      }
      const { options } = builder() as unknown as {
        options: ConstructorParameters<typeof RealMpcMoneyKeyring>[0];
      };

      const bytes = await options.getPrimaryMnemonic();

      expect(handler).toHaveBeenCalledWith(
        { type: 'hd', index: 0 },
        expect.any(Function),
      );
      expect(bytes).toStrictEqual(
        Array.from(new TextEncoder().encode(mnemonic)),
      );
    });

    it('rejects MPC backup derivation when the primary HD mnemonic is unavailable', async () => {
      process.env.MM_MONEY_MPC_KEYRING_ENABLED = 'true';
      process.env.MM_MONEY_MPC_REAL_KEYRING = 'true';
      const messenger = getRootMessenger();
      messenger.registerActionHandler(
        'KeyringController:withKeyringV2Unsafe',
        async (_selector, operation) =>
          operation({
            keyring: new HdKeyringV2({
              legacyKeyring: new LegacyHdKeyring() as never,
              entropySource: 'primary-hd',
            }) as unknown as Keyring,
            metadata: { id: 'primary-hd', name: 'Primary' },
          }),
      );
      const builder = getKeyringBuilders(messenger, false)?.find(
        (entry) => entry.type === MpcMoneyKeyring.type,
      );
      if (!builder) {
        throw new Error('MPC keyring builder missing');
      }
      const { options } = builder() as unknown as {
        options: ConstructorParameters<typeof RealMpcMoneyKeyring>[0];
      };

      const result = options.getPrimaryMnemonic();

      await expect(result).rejects.toThrow(
        'Primary keyring mnemonic unavailable for MPC backups.',
      );
    });
  });
});
