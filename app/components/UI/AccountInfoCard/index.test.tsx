import React from 'react';
import AccountInfoCard from './';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
  createMockUuidFromAddress,
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

const MOCK_ACCOUNT_ID_1 = createMockUuidFromAddress(
  MOCK_ADDRESS_1.toLowerCase(),
);
const NATIVE_SEPOLIA_ASSET_ID = 'eip155:11155111/slip44:60';

const mockInitialState: DeepPartial<RootState> = {
  settings: {
    avatarAccountType: AvatarAccountType.Maskicon,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AssetsController: {
        assetsInfo: {
          [NATIVE_SEPOLIA_ASSET_ID]: {
            type: 'native',
            symbol: 'SepoliaETH',
            decimals: 0,
          },
        },
        assetsBalance: {
          [MOCK_ACCOUNT_ID_1]: {
            [NATIVE_SEPOLIA_ASSET_ID]: { amount: '2' },
          },
        },
        assetsPrice: {
          [NATIVE_SEPOLIA_ASSET_ID]: {
            assetPriceType: 'fungible',
            price: 10,
            usdPrice: 10,
            lastUpdated: Date.now(),
          },
        },
        assetPreferences: {},
        customAssets: {},
        selectedCurrency: 'inr',
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NetworkController: {
        ...mockNetworkState({
          chainId: '0xaa36a7',
          id: 'mainnet',
          nickname: 'Sepolia',
          ticker: 'SepoliaETH',
          type: RpcEndpointType.Infura,
        }),
      },
    },
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
    const { toJSON } = renderWithProvider(
      <AccountInfoCard fromAddress="0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272" />,
      { state: mockInitialState },
    );
    expect(toJSON()).not.toBeNull();
  });

  it('should show balance header in signing page', async () => {
    const { getByText } = renderWithProvider(
      <AccountInfoCard
        fromAddress="0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272"
        operation="signing"
      />,
      { state: mockInitialState },
    );
    expect(getByText(/Balance:/)).toBeDefined();
  });
});
