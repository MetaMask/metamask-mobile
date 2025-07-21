import { AccountSelector, Box, Field } from '@metamask/snaps-sdk/jsx';
import { act, fireEvent } from '@testing-library/react-native';
import { SnapId } from '@metamask/snaps-sdk';
import { SolAccountType } from '@metamask/keyring-api';

import { renderInterface } from '../testUtils';
import {
  createMockInternalAccount,
  MOCK_ADDRESS_1,
} from '../../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';

describe('SnapUIAccountSelector', () => {
  it('renders an account selector', () => {
    const { getByTestId, toJSON } = renderInterface(
      Box({
        children: AccountSelector({
          name: 'account-selector',
        }),
      }),
      {
        state: {
          'account-selector': {
            accountId: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
            addresses: ['eip155:1:0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'],
          },
        },
      },
    );

    expect(getByTestId('snap-ui-renderer__selector')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('can switch account', async () => {
    const { getAllByTestId, getByText } = renderInterface(
      Box({
        children: AccountSelector({
          name: 'account-selector',
        }),
      }),
      {
        state: {
          'account-selector': {
            accountId: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
            addresses: ['eip155:1:0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'],
          },
        },
      },
    );

    const accountSelector = getAllByTestId('snap-ui-renderer__selector')[0];

    await act(async () => {
      fireEvent.press(accountSelector);
    });

    const accountOptions = getAllByTestId('snap-ui-renderer__selector-item');

    expect(accountOptions).toHaveLength(6);

    await act(async () => {
      fireEvent.press(accountOptions[1]);
    });

    expect(getByText('Test Account 2')).toBeTruthy();
  });

  it('can filter accounts owned by the snap', async () => {
    const { getAllByTestId } = renderInterface(
      Box({
        children: AccountSelector({
          name: 'account-selector',
          hideExternalAccounts: true,
        }),
      }),
      {
        snapId: 'local:snap-id' as SnapId,
        state: {
          'account-selector': {
            accountId: '3deeb99-ba0d-4a4e-a0aa-033fc1f79ae3',
            addresses: ['eip155:1:0xb552685e3d2790efd64a175b00d51f02cdafee5d'],
          },
        },
      },
    );

    const accountSelector = getAllByTestId('snap-ui-renderer__selector')[0];

    await act(async () => {
      fireEvent.press(accountSelector);
    });

    const accountOptions = getAllByTestId('snap-ui-renderer__selector-item');

    expect(accountOptions).toHaveLength(1);
  });

  it('can filter accounts by chainId', async () => {
    const MOCK_SOLANA_ADDRESS_1 =
      'F9SpmMkV2rdbZoJxwpFQ192pCyZwcVDc8F9V6B1AWTbR';

    const mockHdAccount = createMockInternalAccount(
      MOCK_ADDRESS_1,
      'Account 1',
      KeyringTypes.hd,
    );

    const mockSnapAccount = createMockInternalAccount(
      MOCK_SOLANA_ADDRESS_1,
      'Second Party Snap Account',
      KeyringTypes.snap,
      SolAccountType.DataAccount,
    );

    const mockHdKeyring = {
      type: KeyringTypes.hd,
      accounts: [mockHdAccount.address],
      metadata: {
        id: 'keyring1',
      },
    };

    const mockSnapKeyring = {
      type: KeyringTypes.snap,
      accounts: [mockSnapAccount.address],
      metadata: {
        id: 'keyring2',
      },
    };

    const mockMultichainBalances = {
      [mockSnapAccount.id]: {
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:105': {
          amount: '1',
          unit: 'SOL',
        },
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
          {
            amount: '2',
            unit: 'USDC',
          },
      },
    };

    const mockAccountsAssets = {
      [mockSnapAccount.id]: [
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:105',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      ],
    };

    const mockAssetsMetadata = {
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:105': {
        fungible: true,
        iconUrl:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
        name: 'Solana',
        symbol: 'SOL',
        units: [
          {
            decimals: 9,
            name: 'Solana',
            symbol: 'SOL',
          },
        ],
      },
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
        {
          fungible: true,
          iconUrl:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
          name: 'USDC',
          symbol: 'USDC',
          units: [
            {
              decimals: 9,
              name: 'USDC',
              symbol: 'USDC',
            },
          ],
        },
    };

    const mockConversionRates = {
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:105': {
        conversionTime: 1745405595549,
        currency: 'swift:0/iso4217:USD',
        expirationTime: 1745409195549,
        rate: '151.36',
      },
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
        {
          conversionTime: 1745405595549,
          currency: 'swift:0/iso4217:USD',
          expirationTime: 1745409195549,
          rate: '1.00',
        },
    };

    const mockState = {
      AccountsController: {
        internalAccounts: {
          [mockHdAccount.id]: mockHdAccount,
          [mockSnapAccount.id]: mockSnapAccount,
        },
        selectedAccount: mockHdAccount.id,
      },
      KeyringController: {
        keyrings: [mockHdKeyring, mockSnapKeyring],
      },
      MultichainBalancesController: {
        balances: mockMultichainBalances,
      },
      MultichainAssetsController: {
        accountsAssets: mockAccountsAssets,
        assetsMetadata: mockAssetsMetadata,
      },
      MultichainAssetsRatesController: {
        conversionRates: mockConversionRates,
      },
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [mockHdAccount.address]: {
              balance: '0x0',
            },
          },
        },
      },
    };

    const { getAllByTestId } = renderInterface(
      Box({
        children: AccountSelector({
          name: 'account-selector',
          chainIds: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
        }),
      }),
      {
        backgroundState: mockState,
        state: {
          'account-selector': {
            accountId: '00f8e632-f0b7-4953-9e20-a9faadf94288',
            addresses: [
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv',
            ],
          },
        },
      },
    );

    const accountSelector = getAllByTestId('snap-ui-renderer__selector')[0];

    await act(async () => {
      fireEvent.press(accountSelector);
    });

    const accountOptions = getAllByTestId('snap-ui-renderer__selector-item');

    expect(accountOptions).toHaveLength(1);
  });

  it('renders inside a field', () => {
    const { toJSON, getByText } = renderInterface(
      Box({
        children: Field({
          label: 'Account Selector',
          children: AccountSelector({
            name: 'account-selector',
          }),
        }),
      }),
      {
        state: {
          'account-selector': {
            accountId: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
            addresses: ['eip155:1:0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'],
          },
        },
      },
    );

    expect(getByText('Account Selector')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('can show an error', () => {
    const { getByText, getAllByTestId } = renderInterface(
      Box({
        children: Field({
          label: 'Account Selector',
          children: AccountSelector({
            name: 'account-selector',
          }),
          error: 'This is an error',
        }),
      }),
      {
        state: {
          'account-selector': {
            accountId: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
            addresses: ['eip155:1:0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'],
          },
        },
      },
    );

    expect(getAllByTestId('snap-ui-renderer__account-selector')).toHaveLength(
      1,
    );

    expect(getByText('This is an error')).toBeTruthy();
  });
});
