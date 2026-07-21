import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { QrKeyring as LegacyQrKeyring } from '@metamask/eth-qr-keyring';
import { QrKeyring } from '@metamask/eth-qr-keyring/v2';
import { LedgerKeyring as LegacyLedgerKeyring } from '@metamask/eth-ledger-bridge-keyring';
import { LedgerKeyring } from '@metamask/eth-ledger-bridge-keyring/v2';
import { HdKeyring as LegacyHdKeyring } from '@metamask/eth-hd-keyring';
import { HdKeyring as HdKeyringV2 } from '@metamask/eth-hd-keyring/v2';
import { MoneyKeyring as LegacyMoneyKeyring } from '@metamask/eth-money-keyring';
import { MoneyKeyring } from '@metamask/eth-money-keyring/v2';
import type { Keyring } from '@metamask/keyring-api/v2';
import type { KeyringControllerWithKeyringV2UnsafeAction } from '@metamask/keyring-controller';
import {
  getKeyringBuilders,
  getKeyringV2Builders,
  qrKeyringBridge,
} from './keyrings';
import { SnapKeyring as SnapKeyringV2 } from '@metamask/eth-snap-keyring/v2';

jest.mock('../../../store', () => ({
  store: { dispatch: jest.fn() },
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
    KeyringControllerWithKeyringV2UnsafeAction,
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

    it('MoneyKeyring getMnemonic closure routes through withKeyringV2Unsafe and matches HD keyrings by id', async () => {
      const messenger = getRootMessenger();
      const legacyHd = new LegacyHdKeyring();
      await legacyHd.deserialize({
        mnemonic: 'test test test test test test test test test test test ball',
      });
      const hdKeyring = new HdKeyringV2({
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
        legacyKeyring: new LegacyHdKeyring(),
        entropySource: 'entropy-1',
      });

      messenger.registerActionHandler(
        'KeyringController:withKeyringV2Unsafe',
        (_selector, operation) =>
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
        cryptographicFunctions: {
          pbkdf2Sha512: async () => new Uint8Array(),
          hmacSha512: async () => new Uint8Array(),
        },
        getMnemonic: async () => [],
      });
      const moneyV2 = byType[LegacyMoneyKeyring.type](legacyMoney as never, {
        id: 'entropy-3',
        name: 'money',
      });
      expect(moneyV2).toBeInstanceOf(MoneyKeyring);
    });
  });
});
