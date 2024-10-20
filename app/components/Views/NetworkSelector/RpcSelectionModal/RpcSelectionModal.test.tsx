// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
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
          [CHAIN_IDS.LINEA_MAINNET]: {
            rpcEndpoints: [
              {
                url: 'https://linea.infura.io/v3/{infuraProjectId}',
                networkClientId: 'lineaMainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://lineascan.io'],
            chainId: CHAIN_IDS.LINEA_MAINNET,
            name: 'Linea Mainnet',
            nativeCurrency: {
              name: 'Linea Ether',
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

  it('should render correctly when visible', () => {
    const { toJSON } = renderWithProvider(
      <RpcSelectionModal {...defaultProps} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should not render when not visible', () => {
    const { queryByText } = renderWithProvider(
      <RpcSelectionModal
        {...defaultProps}
        showMultiRpcSelectModal={{
          ...defaultProps.showMultiRpcSelectModal,
          isVisible: false,
        }}
      />,
    );
    expect(queryByText('Mainnet')).toBeNull();
  });

  it('should display the correct network name for Ethereum Mainnet', () => {
    const { getByText } = renderWithProvider(
      <RpcSelectionModal {...defaultProps} />,
    );
    expect(getByText('Mainnet')).toBeTruthy();
  });

  it('should display the correct network name for Linea Mainnet', () => {
    const { getByText } = renderWithProvider(
      <RpcSelectionModal
        {...defaultProps}
        showMultiRpcSelectModal={{
          isVisible: true,
          chainId: CHAIN_IDS.LINEA_MAINNET,
          networkName: 'Linea Mainnet',
        }}
      />,
    );
    expect(getByText('Linea Mainnet')).toBeTruthy();
  });

  it('should call onRpcSelect and closeRpcModal when an RPC is selected', () => {
    const { getByText } = renderWithProvider(
      <RpcSelectionModal {...defaultProps} />,
    );
    const rpcUrlElement = getByText('mainnet.infura.io/v3');

    fireEvent.press(rpcUrlElement);

    expect(defaultProps.onRpcSelect).toHaveBeenCalledWith(
      'mainnet',
      CHAIN_IDS.MAINNET,
    );
    expect(defaultProps.closeRpcModal).toHaveBeenCalled();
  });

  it('should handle no RPC endpoints gracefully', () => {
    const { queryByText } = renderWithProvider(
      <RpcSelectionModal
        {...defaultProps}
        showMultiRpcSelectModal={{
          ...defaultProps.showMultiRpcSelectModal,
          chainId: '0x2',
        }}
      />,
    );

    expect(queryByText('mainnet.infura.io')).toBeNull(); // Should not render any RPC URLs
  });
});
