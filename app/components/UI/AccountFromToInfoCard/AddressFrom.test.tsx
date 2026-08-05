import React from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';

import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../reducers';
import AddressFrom from './AddressFrom';

const MOCK_ADDRESS = '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          [CHAIN_IDS.MAINNET]: {
            [MOCK_ADDRESS]: {
              balance: '200',
            },
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../hooks/useAddressBalance/useAddressBalance', () => ({
  __esModule: true,
  default: () => ({ addressBalance: '1 ETH' }),
}));

jest.mock('../../Views/confirmations/hooks/useNetworkInfo', () => ({
  __esModule: true,
  default: () => ({
    networkName: 'Ethereum Mainnet',
    networkImage: { uri: 'https://example.com/eth.png' },
  }),
}));

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  getLabelTextByAddress: () => undefined,
  renderAccountName: () => 'Account 1',
  toChecksumAddress: (address: string) => address,
}));

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');

  return {
    context: {
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
      KeyringController: {
        state: { keyrings: [] },
      },
    },
  };
});

describe('AddressFrom', () => {
  it('renders from label and account balance with network badge', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AddressFrom
        asset={{
          address: MOCK_ADDRESS,
          symbol: 'ETH',
          decimals: 18,
          isETH: true,
        }}
        from={MOCK_ADDRESS}
        chainId={CHAIN_IDS.MAINNET}
      />,
      { state: mockInitialState },
    );

    expect(getByText('From:')).toBeOnTheScreen();
    expect(getByTestId('account-balance')).toBeOnTheScreen();
    expect(getByTestId('account-base-network-badge')).toBeOnTheScreen();
    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
  });
});
