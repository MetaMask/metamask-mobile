import '../../../../tests/component-view/mocks';

import { fireEvent, within } from '@testing-library/react-native';
import React from 'react';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import {
  clearQrSyncAccountsReview,
  setQrSyncAccountsReview,
} from '../../../core/QrSync/qrSyncAccountsReview';
import { createMockRouteMessenger } from '../../../util/test/mock-route-messenger';
import { renderShortAddress } from '../../../util/address';
import {
  getRouteProbeTestId,
  renderScreenWithRoutes,
} from '../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import AccountsImported from './AccountsImported';
import { AccountsImportedTestIds } from './AccountsImported.testIds';

const IMPORTED_ACCOUNTS = [
  {
    id: 'wallet:primary/0',
    name: 'Mobile Perf SRP 1',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  },
  {
    id: 'wallet:primary/1',
    name: 'Account 2',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  },
];

const resetState = jest.fn().mockResolvedValue(undefined);

const ONE_WALLET = [
  {
    id: 'wallet:primary',
    walletName: 'Wallet 1',
    accounts: IMPORTED_ACCOUNTS,
  },
];

const TWO_WALLETS_ONE_ACCOUNT = [
  {
    id: 'wallet:primary',
    walletName: 'Wallet 1',
    accounts: [IMPORTED_ACCOUNTS[0]],
  },
  {
    id: 'wallet:secondary',
    walletName: 'Wallet 2',
    accounts: [],
  },
];

const showReview = (
  mode: 'new-user' | 'existing-user',
  sections = ONE_WALLET,
) => {
  setQrSyncAccountsReview({
    mode,
    sections,
  });
};

const renderAccountsImported = () =>
  renderScreenWithRoutes(
    AccountsImported as React.ComponentType,
    { name: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET },
    [
      { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
      { name: Routes.WALLET_VIEW },
    ],
    {
      routeMessenger: createMockRouteMessenger({
        'QrSyncController:resetState': resetState,
      }),
    },
  );

describeForPlatforms('AccountsImported', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetState.mockResolvedValue(undefined);
    clearQrSyncAccountsReview();
  });

  it('lists every imported account and continues to create a password', async () => {
    showReview('new-user');

    const { findByTestId, findByText, getByTestId } = renderAccountsImported();

    expect(
      await findByText(
        strings('app_settings.add_device.accounts_imported_title_other', {
          accountCount: 2,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      await findByText(
        strings('app_settings.add_device.accounts_imported_description_one'),
      ),
    ).toBeOnTheScreen();
    expect(await findByText('Wallet 1')).toBeOnTheScreen();

    for (const account of IMPORTED_ACCOUNTS) {
      const row = await findByTestId(
        `${AccountsImportedTestIds.ACCOUNT_ROW}-${account.id}`,
      );
      expect(within(row).getByText(account.name)).toBeOnTheScreen();
      expect(
        within(row).getByText(renderShortAddress(account.address, 4)),
      ).toBeOnTheScreen();
    }

    fireEvent.press(getByTestId(AccountsImportedTestIds.CONTINUE));

    expect(
      await findByTestId(
        getRouteProbeTestId(
          Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('goes home when an existing user presses Done', async () => {
    showReview('existing-user');

    const { findByTestId, findByText, getByTestId, queryByText } =
      renderAccountsImported();

    expect(
      await findByText(strings('app_settings.add_device.done')),
    ).toBeOnTheScreen();
    expect(
      await findByText(
        strings(
          'app_settings.add_device.accounts_imported_description_existing_one',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('app_settings.add_device.create_password')),
    ).not.toBeOnTheScreen();
    expect(
      queryByText(
        strings('app_settings.add_device.accounts_imported_description_one'),
      ),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(AccountsImportedTestIds.CONTINUE));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.WALLET_VIEW)),
    ).toBeOnTheScreen();
  });

  it('uses singular account and plural wallet copy for a new user', async () => {
    showReview('new-user', TWO_WALLETS_ONE_ACCOUNT);

    const { findByText } = renderAccountsImported();

    expect(
      await findByText(
        strings('app_settings.add_device.accounts_imported_title_one', {
          accountCount: 1,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      await findByText(
        strings('app_settings.add_device.accounts_imported_description_other', {
          walletCount: 2,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('omits the password sentence when an existing user imports several wallets', async () => {
    showReview('existing-user', TWO_WALLETS_ONE_ACCOUNT);

    const { findByText, queryByText } = renderAccountsImported();

    expect(
      await findByText(
        strings(
          'app_settings.add_device.accounts_imported_description_existing_other',
          { walletCount: 2 },
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByText(
        strings('app_settings.add_device.accounts_imported_description_other', {
          walletCount: 2,
        }),
      ),
    ).not.toBeOnTheScreen();
  });

  it('returns to add this device when back is pressed', async () => {
    showReview('new-user');

    const { findByTestId, queryByTestId } = renderAccountsImported();

    fireEvent.press(await findByTestId(AccountsImportedTestIds.BACK));

    expect(resetState).toHaveBeenCalled();
    expect(queryByTestId(AccountsImportedTestIds.SCREEN)).not.toBeOnTheScreen();
  });
});
