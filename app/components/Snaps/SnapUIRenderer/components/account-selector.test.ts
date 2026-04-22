import { AccountSelector, Box, Field } from '@metamask/snaps-sdk/jsx';
import { act, fireEvent } from '@testing-library/react-native';
import { SnapId } from '@metamask/snaps-sdk';

import { renderInterface } from '../testUtils';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';

jest.mock('../../../../core/Engine/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    SnapInterfaceController: {
      updateInterfaceState: jest.fn(),
    },
    AccountsController: {
      setSelectedAccount: jest.fn(),
    },
  },
}));

// Mock useAccounts
jest.mock('../../../hooks/useAccounts', () => {
  const useAccountsMock = jest.fn(() => ({
    accounts: [
      {
        name: 'Account 1',
        address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
          tokens: [],
        },
        type: 'HD Key Tree',
        yOffset: 0,
        scopes: ['eip155:0'],
        isSelected: true,
        balanceError: undefined,
        caipAccountId: 'eip155:0:0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      },
      {
        name: 'Solana Account 1',
        address: 'F9SpmMkV2rdbZoJxwpFQ192pCyZwcVDc8F9V6B1AWTbR',
        assets: {
          fiatBalance: '$6400.00\n1 SOL',
          tokens: [],
        },
        type: 'Snap Keyring',
        snapId: 'local:snap-id',
        yOffset: 0,
        scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
        isSelected: false,
        balanceError: undefined,
        caipAccountId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:F9SpmMkV2rdbZoJxwpFQ192pCyZwcVDc8F9V6B1AWTbR',
      },
    ],
    evmAccounts: [],
    ensByAccountAddress: {},
  }));
  return {
    useAccounts: useAccountsMock,
    Account: Object, // Mock for the Account type
  };
});

describe('SnapUIAccountSelector', () => {
  const mockState = {
    PreferencesController: {
      privacyMode: false,
    },
    MultichainNetworkController: {
      networksWithTransactionActivity: {
        '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
          activeChains: ['0x1', '0x89'],
        },
        F9SpmMkV2rdbZoJxwpFQ192pCyZwcVDc8F9V6B1AWTbR: {
          activeChains: [],
        },
      },
    },
  };

  const mockSettings = {
    avatarAccountType: AvatarAccountType.Maskicon,
  };

  it('renders an account selector', () => {
    const { getByTestId, toJSON } = renderInterface(
      Box({
        children: AccountSelector({
          name: 'account-selector',
        }),
      }),
      {
        backgroundState: mockState,
        stateSettings: mockSettings,
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
        backgroundState: mockState,
        stateSettings: mockSettings,
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

    expect(accountOptions).toHaveLength(2);

    await act(async () => {
      fireEvent.press(accountOptions[1]);
    });

    expect(getByText('Solana Account 1')).toBeTruthy();
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
        backgroundState: mockState,
        stateSettings: mockSettings,
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
    const { getAllByTestId } = renderInterface(
      Box({
        children: AccountSelector({
          name: 'account-selector',
          chainIds: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
        }),
      }),
      {
        backgroundState: mockState,
        stateSettings: mockSettings,
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
        backgroundState: mockState,
        stateSettings: mockSettings,
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
        backgroundState: mockState,
        stateSettings: mockSettings,
        state: {
          'account-selector': {
            accountId: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
            addresses: ['eip155:1:0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'],
          },
        },
      },
    );

    expect(getAllByTestId('snap-ui-renderer__selector')).toHaveLength(1);

    expect(getByText('This is an error')).toBeTruthy();
  });
});
