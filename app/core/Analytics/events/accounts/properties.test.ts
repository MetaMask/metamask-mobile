import { AccountWalletType } from '@metamask/account-api';
import type { AccountWalletObject } from '@metamask/account-tree-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import {
  ManageAccountsViewedSource,
  buildManageAccountsViewedProperties,
  getAccountWalletMetricProps,
} from '.';

const createKeyringWallet = (keyringType: KeyringTypes) =>
  ({
    id: `keyring:${keyringType}`,
    type: AccountWalletType.Keyring,
    metadata: { name: keyringType, keyring: { type: keyringType } },
    groups: {},
  }) as unknown as AccountWalletObject;

describe('accounts event properties', () => {
  it('maps the account tree totals onto the schema property names', () => {
    expect(
      buildManageAccountsViewedProperties(
        ManageAccountsViewedSource.AccountList,
        { totalAccounts: 5, totalWallets: 3, hiddenCount: 2 },
      ),
    ).toEqual({
      source: 'account_list',
      total_accounts: 5,
      total_wallets: 3,
      hidden_count: 2,
    });
  });

  it('keeps zero counts rather than dropping them, since all four are required', () => {
    expect(
      buildManageAccountsViewedProperties(
        ManageAccountsViewedSource.AccountMenu,
        { totalAccounts: 0, totalWallets: 0, hiddenCount: 0 },
      ),
    ).toEqual({
      source: 'account_menu',
      total_accounts: 0,
      total_wallets: 0,
      hidden_count: 0,
    });
  });
});

describe('getAccountWalletMetricProps', () => {
  it('reports entropy wallets as metamask accounts', () => {
    const wallet = {
      id: 'entropy:01',
      type: AccountWalletType.Entropy,
      metadata: { name: 'Wallet 1', entropy: { id: '01' } },
      groups: {},
    } as unknown as AccountWalletObject;

    expect(getAccountWalletMetricProps(wallet)).toEqual({
      account_type: 'metamask',
    });
  });

  it('reports snap wallets with the snap id', () => {
    const wallet = {
      id: 'snap:npm:@metamask/simple-keyring-snap',
      type: AccountWalletType.Snap,
      metadata: {
        name: 'Simple Keyring',
        snap: { id: 'npm:@metamask/simple-keyring-snap' },
      },
      groups: {},
    } as unknown as AccountWalletObject;

    expect(getAccountWalletMetricProps(wallet)).toEqual({
      account_type: 'snap',
      account_snap_type: 'npm:@metamask/simple-keyring-snap',
    });
  });

  it('reports imported private key wallets as imported', () => {
    expect(
      getAccountWalletMetricProps(createKeyringWallet(KeyringTypes.simple)),
    ).toEqual({ account_type: 'imported' });
  });

  it.each([
    [KeyringTypes.ledger, 'Ledger'],
    [KeyringTypes.trezor, 'Trezor'],
    [KeyringTypes.lattice, 'Lattice'],
    [KeyringTypes.qr, 'QR Hardware'],
    [KeyringTypes.oneKey, 'QR Hardware'],
  ])(
    'reports %s wallets with the %s device name as both account and hardware type',
    (keyringType, deviceName) => {
      expect(
        getAccountWalletMetricProps(createKeyringWallet(keyringType)),
      ).toEqual({
        account_type: deviceName,
        account_hardware_type: deviceName,
      });
    },
  );

  it('falls back to metamask for other keyring wallets', () => {
    expect(
      getAccountWalletMetricProps(createKeyringWallet(KeyringTypes.hd)),
    ).toEqual({ account_type: 'metamask' });
  });

  it.each([undefined, null])(
    'falls back to metamask when the wallet is %s',
    (wallet) => {
      expect(getAccountWalletMetricProps(wallet)).toEqual({
        account_type: 'metamask',
      });
    },
  );
});
