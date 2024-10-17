// Third party dependencies.
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';

// Internal dependencies.
import RpcSelectionModal from './RpcSelectionModal';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NetworkConfiguration } from '@metamask/network-controller';

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurations: {
          [CHAIN_IDS.MAINNET]: {
            rpcEndpoints: [
              {
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                networkClientId: 'mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://etherscan.io'],
            chainId: CHAIN_IDS.MAINNET,
            name: 'Ethereum Mainnet',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
          },
        },
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: (state: unknown) => unknown) => fn(MOCK_STORE_STATE),
}));

jest.mock('react-native-safe-area-context', () => {
  // using disting digits for mock rects to make sure they are not mixed up
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
    }),
  };
});

describe('RpcSelectionModal', () => {
  // Fully mock rpcMenuSheetRef to match the BottomSheetRef type
  const mockRpcMenuSheetRef = {
    current: {
      onOpenBottomSheet: jest.fn(),
      onCloseBottomSheet: jest.fn(),
    },
  };

  const defaultProps = {
    showMultiRpcSelectModal: {
      isVisible: true,
      chainId: CHAIN_IDS.MAINNET,
      networkName: 'Mainnet',
    },
    closeRpcModal: jest.fn(),
    onRpcSelect: jest.fn(),
    rpcMenuSheetRef: mockRpcMenuSheetRef,
    networkConfigurations: MOCK_STORE_STATE.engine.backgroundState
      .NetworkController.networkConfigurations as unknown as Record<
      string,
      NetworkConfiguration
    >,

    styles: {
      baseHeader: {},
      cellBorder: {},
      rpcMenu: {},
      rpcText: {},
      textCentred: {},
      alternativeText: {},
    },
  };

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <RpcSelectionModal {...defaultProps} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
