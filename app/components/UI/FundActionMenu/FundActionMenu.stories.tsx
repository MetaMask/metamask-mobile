// Third party dependencies.
import React from 'react';

// External dependencies.
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import { default as FundActionMenuComponent } from './FundActionMenu';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { EthMethod } from '@metamask/keyring-api';

// Mock navigation
const mockNavigate = () => {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Mock metrics hook
jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: () => {},
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => {} }),
    }),
  }),
}));

// Mock ramp hooks
jest.mock('../Ramp/Aggregator/hooks/useRampNetwork', () => () => [true]);
jest.mock('../Ramp/Deposit/hooks/useDepositEnabled', () => ({
  __esModule: true,
  default: () => ({ isDepositEnabled: true }),
}));

// Mock trace
jest.mock('../../../util/trace', () => ({
  trace: () => {},
  TraceName: {
    LoadRampExperience: 'LoadRampExperience',
    LoadDepositExperience: 'LoadDepositExperience',
  },
}));

const expectedUuid2 = '0178e31d-5a88-4a8b-b00a-3e0795a8c4a3';

// Create mock store
const createMockStore = () => {
  const mockState = {
    engine: {
      backgroundState: {
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        NetworkController: {
          selectedNetworkClientId: 'mainnet',
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                  url: 'https://mainnet.infura.io/v3/network-id',
                  type: 'infura',
                },
              ],
              defaultRpcEndpointIndex: 0,
              blockExplorerUrls: ['https://etherscan.io'],
              defaultBlockExplorerUrlIndex: 0,
              name: 'Ethereum Mainnet',
              nativeCurrency: 'ETH',
            },
          },
          networksMetadata: {
            mainnet: {
              EIPS: {
                1559: true,
              },
              status: 'available',
            },
          },
        },
        KeyringController: {
          keyrings: [
            {
              accounts: [expectedUuid2],
              type: 'HD Key Tree',
            },
          ],
        },
        AccountsController: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE,
          internalAccounts: {
            ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
            accounts: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
              [expectedUuid2]: {
                ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
                  expectedUuid2
                ],
                methods: [
                  EthMethod.PersonalSign,
                  EthMethod.Sign,
                  EthMethod.SignTransaction,
                  EthMethod.SignTypedDataV1,
                  EthMethod.SignTypedDataV3,
                  EthMethod.SignTypedDataV4,
                ],
              },
            },
          },
        },
      },
    },
  };

  return createStore(() => mockState);
};

const FundActionMenuMeta = {
  title: 'Components / UI / FundActionMenu',
  component: FundActionMenuComponent,
  decorators: [
    (Story: any) => (
      <Provider store={createMockStore()}>
        <Story />
      </Provider>
    ),
  ],
  argTypes: {
    // No props needed as the component gets all data from Redux store
  },
};

export default FundActionMenuMeta;

// Default story showing all three actions (Deposit, Buy, Sell)
export const Default = {
  args: {},
};

// Story with custom container styling
export const WithCustomStyling = {
  args: {},
  decorators: [
    (Story: any) => (
      <Provider store={createMockStore()}>
        <div style={{ padding: '20px', backgroundColor: '#f5f5f5' }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
};

// Story showing behavior when ramp is not supported
export const RampNotSupported = {
  args: {},
  decorators: [
    (Story: any) => {
      // Mock ramp as not supported for this story
      jest.doMock('../Ramp/Aggregator/hooks/useRampNetwork', () => () => [
        false,
      ]);

      return (
        <Provider store={createMockStore()}>
          <Story />
        </Provider>
      );
    },
  ],
};

// Story showing behavior when deposit is disabled
export const DepositDisabled = {
  args: {},
  decorators: [
    (Story: any) => {
      // Mock deposit as disabled for this story
      jest.doMock('../Ramp/Deposit/hooks/useDepositEnabled', () => ({
        __esModule: true,
        default: () => ({ isDepositEnabled: false }),
      }));

      return (
        <Provider store={createMockStore()}>
          <Story />
        </Provider>
      );
    },
  ],
};
