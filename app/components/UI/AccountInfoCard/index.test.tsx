import React from 'react';
import AccountInfoCard from './';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
} from '../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../reducers';
import { RpcEndpointType } from '@metamask/network-controller';
import { mockNetworkState } from '../../../util/test/network';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar';

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
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
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

const mockInitialState: DeepPartial<RootState> = {
  settings: {
    avatarStyle: AvatarAccountType.Maskicon,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          '0xaa36a7': {
            [MOCK_ADDRESS_1]: {
              balance: '0x2',
            },
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      CurrencyRateController: {
        currentCurrency: 'inr',
        currencyRates: {
          ETH: {
            conversionRate: 10,
          },
        },
      },
      NetworkController: {
        ...mockNetworkState({
          chainId: '0xaa36a7',
          id: 'mainnet',
          nickname: 'Sepolia',
          ticker: 'SepoliaETH',
          type: RpcEndpointType.Infura,
        }),
      },
      TokenBalancesController: {
        tokenBalances: {},
      },
    },
  },
  transaction: {
    origin: 'https://metamask.io',
    chainId: '0xaa36a7',
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

jest.mock('is-url', () => jest.fn());
jest.mock('../../../core/SDKConnect/SDKConnect', () => ({
  getInstance: () => ({
    getConnections: jest.fn().mockReturnValue({
      'https://metamask.io': {
        originatorInfo: {
          url: 'https://metamask.io',
          icon: 'https://metamask.io/icon.png',
        },
      },
    }),
  }),
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
        origin="https://metamask.io"
      />,
      { state: mockInitialState },
    );

    expect(getByText('https://metamask.io')).toBeDefined();
  });
});
