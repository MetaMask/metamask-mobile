import React from 'react';
import AccountInfoCard from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import {
  createMockInternalAccount,
  createMockUUIDFromAddress,
} from '../../../selectors/accountsController.test';
import { AccountsControllerState } from '@metamask/accounts-controller';

jest.mock('../../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      createNewVaultAndKeychain: () => jest.fn(),
      setLocked: () => jest.fn(),
      getAccountKeyringType: () => Promise.resolve('HD Key Tree'),
    },
  },
}));

const MOCK_ADDRESS = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';

const expectedUUID = createMockUUIDFromAddress(MOCK_ADDRESS);

const internalAccount1 = createMockInternalAccount(
  MOCK_ADDRESS.toLowerCase(),
  'Account 1',
);

const MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      [expectedUUID]: internalAccount1,
    },
    selectedAccount: expectedUUID,
  },
};

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountTrackerController: {
        accounts: {
          [MOCK_ADDRESS]: {
            balance: '0x2',
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      CurrencyRateController: {
        conversionRate: 10,
        currentCurrency: 'inr',
      },
      NetworkController: {
        providerConfig: {
          chainId: '0xaa36a7',
          type: 'sepolia',
          nickname: 'Sepolia',
        },
      },
      TokenBalancesController: {
        contractBalances: {},
      },
    },
  },
  transaction: {
    origin: 'https://metamask.io',
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

describe('AccountInfoCard', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(
      <AccountInfoCard fromAddress="0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272" />,
      { state: mockInitialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should show balance header in signing page', async () => {
    const { getByText } = renderWithProvider(
      <AccountInfoCard
        fromAddress="0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272"
        operation="signing"
      />,
      { state: mockInitialState },
    );
    expect(getByText('Balance')).toBeDefined();
  });

  it('should show origin header in signing page', async () => {
    const { getByText } = renderWithProvider(
      <AccountInfoCard
        fromAddress="0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272"
        operation="signing"
      />,
      { state: mockInitialState },
    );

    expect(getByText('https://metamask.io')).toBeDefined();
  });
});
