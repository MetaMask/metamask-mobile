import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import {
  createMockNotificationERC20Received,
  createMockNotificationEthReceived,
} from '@metamask/notification-services-controller/notification-services/mocks';
import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import { AccountType } from '../../constants/onboarding';
import {
  computeDaysSinceWalletCreation,
  getWalletFundsObtainedSource,
  hasNonZeroTokenBalance,
  isAboveWalletFundsObtainedThreshold,
  isCreatedWalletAccountType,
  type EthOrErc20ReceivedNotification,
  WALLET_FUNDS_OBTAINED_MIN_USD_EXCLUSIVE,
} from './wallet-funds-obtained';

describe('wallet-funds-obtained', () => {
  describe('hasNonZeroTokenBalance', () => {
    it('returns true for wei-sized balances above MAX_SAFE_INTEGER (no throw)', () => {
      const oneEthWei = '0xde0b6b3a7640000' as const; // 10^18
      expect(
        hasNonZeroTokenBalance({
          '0xabc': {
            '0x1': { '0x0': oneEthWei },
          },
        }),
      ).toBe(true);
    });

    it('returns false for zero balances', () => {
      expect(
        hasNonZeroTokenBalance({
          '0xabc': {
            '0x1': { '0x0': '0x0' },
          },
        }),
      ).toBe(false);
    });
  });

  describe('isCreatedWalletAccountType', () => {
    it('returns true for created-wallet account types', () => {
      expect(isCreatedWalletAccountType(AccountType.Metamask)).toBe(true);
      expect(isCreatedWalletAccountType(AccountType.MetamaskGoogle)).toBe(true);
      expect(isCreatedWalletAccountType(AccountType.MetamaskApple)).toBe(true);
    });

    it('returns false for imported account types', () => {
      expect(isCreatedWalletAccountType(AccountType.Imported)).toBe(false);
      expect(isCreatedWalletAccountType(AccountType.ImportedGoogle)).toBe(
        false,
      );
    });

    it('returns false when account type is missing', () => {
      expect(isCreatedWalletAccountType(undefined)).toBe(false);
    });
  });

  describe('isAboveWalletFundsObtainedThreshold', () => {
    it(`returns false for amounts at or below ${WALLET_FUNDS_OBTAINED_MIN_USD_EXCLUSIVE} USD`, () => {
      expect(isAboveWalletFundsObtainedThreshold('0')).toBe(false);
      expect(isAboveWalletFundsObtainedThreshold('1')).toBe(false);
      expect(isAboveWalletFundsObtainedThreshold('0.5')).toBe(false);
    });

    it('returns true for amounts strictly above threshold', () => {
      expect(isAboveWalletFundsObtainedThreshold('1.01')).toBe(true);
      expect(isAboveWalletFundsObtainedThreshold('100')).toBe(true);
    });
  });

  describe('getWalletFundsObtainedSource', () => {
    const baseOrder: RampsOrder = {
      isOnlyLink: false,
      success: true,
      cryptoAmount: 1,
      fiatAmount: 100,
      providerOrderId: 'o1',
      providerOrderLink: '',
      createdAt: Date.now(),
      totalFeesFiat: 0,
      txHash:
        '0xb2256b183f2fb3872f99294ab55fb03e6a479b0d4aca556a3b27568b712505a6',
      walletAddress: '0xabc',
      status: RampsOrderStatus.Completed,
      network: { name: 'Ethereum', chainId: '1' },
      canBeUpdated: false,
      idHasExpired: false,
      excludeFromPurchases: false,
      timeDescriptionPending: '',
      orderType: 'BUY',
    };

    it('returns on_ramp when a completed buy matches tx hash', () => {
      const n =
        createMockNotificationEthReceived() as EthOrErc20ReceivedNotification;
      const orders: RampsOrder[] = [baseOrder];
      expect(getWalletFundsObtainedSource(n, orders)).toBe('on_ramp');
    });

    it('returns external_transfer when no order matches', () => {
      const n =
        createMockNotificationEthReceived() as EthOrErc20ReceivedNotification;
      const orders: RampsOrder[] = [
        {
          ...baseOrder,
          txHash: '0xdead',
        },
      ];
      expect(getWalletFundsObtainedSource(n, orders)).toBe('external_transfer');
    });

    it('returns external_transfer for erc20 when tx does not match a buy', () => {
      const n =
        createMockNotificationERC20Received() as EthOrErc20ReceivedNotification;
      expect(getWalletFundsObtainedSource(n, [])).toBe('external_transfer');
    });

    it('ignores non-BUY orders', () => {
      const n =
        createMockNotificationEthReceived() as EthOrErc20ReceivedNotification;
      const orders: RampsOrder[] = [
        { ...baseOrder, orderType: 'SELL', status: RampsOrderStatus.Completed },
      ];
      expect(getWalletFundsObtainedSource(n, orders)).toBe('external_transfer');
    });

    it('ignores non-completed orders', () => {
      const n =
        createMockNotificationEthReceived() as EthOrErc20ReceivedNotification;
      const orders: RampsOrder[] = [
        { ...baseOrder, status: RampsOrderStatus.Pending },
      ];
      expect(getWalletFundsObtainedSource(n, orders)).toBe('external_transfer');
    });
  });

  describe('computeDaysSinceWalletCreation', () => {
    it('returns whole days between creation and now', () => {
      const dayMs = 86_400_000;
      const created = 1_000_000;
      expect(computeDaysSinceWalletCreation(created, created + dayMs)).toBe(1);
      expect(computeDaysSinceWalletCreation(created, created + dayMs - 1)).toBe(
        0,
      );
    });
  });

  describe('erc20 notification typing', () => {
    it('mock erc20 uses ERC20_RECEIVED trigger', () => {
      const n = createMockNotificationERC20Received();
      expect(n.type).toBe(TRIGGER_TYPES.ERC20_RECEIVED);
    });
  });
});
