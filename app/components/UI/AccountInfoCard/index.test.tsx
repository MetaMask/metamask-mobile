import React from 'react';
import AccountInfoCard from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  renderAccountName: () => '0x0',
}));

jest.mock('../../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    KeyringController: {
      state: {
        keyrings: []
      },
      createNewVaultAndKeychain: () => jest.fn(),
      setLocked: () => jest.fn(),
      getAccountKeyringType: () => Promise.resolve('HD Key Tree'),
    },
  },
}));

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountTrackerController: {
        accounts: {
          '0x0': {
            balance: '0x2',
          },
        },
      },
      PreferencesController: {
        selectedAddress: '0x0',
        identities: {
          address: '0x0',
          name: 'Account 1',
        },
      },
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
      <AccountInfoCard fromAddress="0x0" />,
      { state: mockInitialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should show balance header in signing page', async () => {
    const { getByText } = renderWithProvider(
      <AccountInfoCard fromAddress="0x0" operation="signing" />,
      { state: mockInitialState },
    );
    expect(getByText('Balance')).toBeDefined();
  });

  it('should show origin header in signing page', async () => {
    const { getByText } = renderWithProvider(
      <AccountInfoCard fromAddress="0x0" operation="signing" />,
      { state: mockInitialState },
    );

    expect(getByText('https://metamask.io')).toBeDefined();
  });
});
