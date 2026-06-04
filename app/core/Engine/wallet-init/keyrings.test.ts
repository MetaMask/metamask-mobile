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
import { MoneyKeyring as LegacyMoneyKeyring } from '@metamask/eth-money-keyring';
import { MoneyKeyring } from '@metamask/eth-money-keyring/v2';
import type { Keyring } from '@metamask/keyring-api/v2';
import type { KeyringControllerWithKeyringV2UnsafeAction } from '@metamask/keyring-controller';
import {
  getKeyringBuilders,
  getKeyringV2Builders,
  qrKeyringBridge,
} from './keyrings';

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
      const builders = getKeyringBuilders(getRootMessenger()) ?? [];
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
      const builders = getKeyringBuilders(getRootMessenger()) ?? [];
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
  });

  describe('getKeyringV2Builders', () => {
    it('returns V2 builders for Ledger, QR, and MoneyKeyring keyed by the legacy type', () => {
      const builders = getKeyringV2Builders() ?? [];
      const types = builders.map((b) => b.type);

      expect(types).toEqual([
        LegacyLedgerKeyring.type,
        LegacyQrKeyring.type,
        LegacyMoneyKeyring.type,
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
