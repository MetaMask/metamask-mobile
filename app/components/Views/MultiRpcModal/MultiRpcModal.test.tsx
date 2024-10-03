import React from 'react';
import MultiRpcModal from './MultiRpcModal';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { fireEvent } from '@testing-library/react-native';
import { RootState } from 'app/reducers';
import { backgroundState } from '../../../util/test/initial-root-state';
import { NetworkStatus, RpcEndpointType } from '@metamask/network-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';

const setShowMultiRpcModalSpy = jest.spyOn(
  Engine.context.PreferencesController,
  'setShowMultiRpcModal',
);

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setShowMultiRpcModal: jest.fn(),
    },
  },
}));

const initialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        showMultiRpcModal: false,
      },
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {
          mainnet: {
            status: NetworkStatus.Available,
            EIPS: {
              '1559': true,
            },
          },
        },
        networkConfigurationsByChainId: {
          [CHAIN_IDS.MAINNET]: {
            blockExplorerUrls: ['https://etherscan.io'],
            chainId: CHAIN_IDS.MAINNET,
            defaultRpcEndpointIndex: 0,
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: RpcEndpointType.Infura,
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
              },
              {
                networkClientId: 'mainnet-alt',
                type: RpcEndpointType.Custom,
                url: 'https://eth-mainnet.alchemyapi.io/v2/{alchemyApiKey}',
                name: 'Alchemy rpc',
              },
            ],
          },
        },
      },
    },
  },
};

const Stack = createStackNavigator();

const renderComponent = (state: DeepPartial<RootState> = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name={Routes.MODAL.MULTI_RPC_MIGRATION_MODAL}>
        {() => <MultiRpcModal />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('MultiRpcModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls setShowMultiRpcModal and trackEvent when clicking on allow button', () => {
    const { getByTestId } = renderComponent(initialState);
    const allowButton = getByTestId('allow');

    fireEvent.press(allowButton);
    expect(setShowMultiRpcModalSpy).toHaveBeenCalledWith(false);
  });
});
