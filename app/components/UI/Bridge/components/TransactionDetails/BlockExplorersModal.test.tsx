import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import React from 'react';
import Routes from '../../../../../constants/navigation/Routes';
import { BridgeState } from '../../../../../core/redux/slices/bridge';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { initialState } from '../../_mocks_/initialState';
import BlockExplorersModal from './BlockExplorersModal';
import { fireEvent } from '@testing-library/react-native';

jest.mock('../../../../../util/analytics/externalLinkTracking', () => ({
  ...jest.requireActual('../../../../../util/analytics/externalLinkTracking'),
  trackBlockExplorerLinkClicked: jest.fn(),
}));
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';

const mockNavigate = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => {
  callback?.();
});

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: forwardRef(
        (
          { children }: { children: React.ReactNode },
          ref: React.Ref<unknown>,
        ) => {
          useImperativeHandle(ref, () => ({
            onCloseBottomSheet: mockOnCloseBottomSheet,
          }));
          return <View testID="bottom-sheet">{children}</View>;
        },
      ),
    };
  },
);

const mockTx = {
  id: 'test-tx-id',
  chainId: '0x1',
  hash: '0x123',
  networkClientId: 'mainnet',
  time: Date.now(),
  txParams: {
    from: '0x123',
    to: '0x456',
    value: '0x0',
    data: '0x',
  },
  status: TransactionStatus.submitted,
} as TransactionMeta;

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      key: '1',
      name: 'params',
      params: {
        evmTxMeta: mockTx,
      },
    }),
  };
});

describe('BlockExplorersModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnCloseBottomSheet.mockImplementation((callback?: () => void) => {
      callback?.();
    });
  });

  const mockState = {
    ...initialState,
    bridge: {
      sourceToken: {
        symbol: 'ETH',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000',
        image: 'https://example.com/image.png',
        chainId: '0x1' as Hex,
      },
      destToken: undefined,
      sourceAmount: undefined,
      destAmount: undefined,
      selectedDestChainId: undefined,
      selectedSourceChainIds: ['0x1' as Hex, '0xa' as Hex],
    } as BridgeState,
  };

  it('should render without crashing', () => {
    const { getByText } = renderScreen(
      () => <BlockExplorersModal />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: mockState },
    );
    expect(getByText('View on block explorer')).toBeTruthy();
  });

  it('should display both source and destination chain block explorer buttons', () => {
    const { getAllByText } = renderScreen(
      () => <BlockExplorersModal />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: mockState },
    );
    const etherscanButton = getAllByText('Etherscan');
    expect(etherscanButton).toHaveLength(1);

    const optimisticButton = getAllByText('Optimistic');
    expect(optimisticButton).toHaveLength(1);
  });

  it('should handle missing destination chain transaction hash', () => {
    const modifiedState = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState.engine.backgroundState,
          BridgeStatusController: {
            txHistory: {
              [mockTx.id]: {
                ...mockState.engine.backgroundState.BridgeStatusController
                  .txHistory['test-tx-id'],
                status: {
                  srcChain: {
                    txHash: '0x123',
                  },
                  destChain: {
                    txHash: undefined,
                  },
                },
              },
            },
          },
        },
      },
    };

    const { getAllByText } = renderScreen(
      () => <BlockExplorersModal />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: modifiedState },
    );
    const etherscanButtons = getAllByText('Etherscan');
    expect(etherscanButtons).toHaveLength(1);
  });

  it('should navigate to webview when source chain explorer button is pressed', () => {
    const { getAllByText } = renderScreen(
      () => <BlockExplorersModal />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: mockState },
    );

    const [srcExplorerButton] = getAllByText('Etherscan');
    fireEvent.press(srcExplorerButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: expect.objectContaining({
        url: expect.stringContaining('etherscan.io'),
      }),
    });
    expect(jest.mocked(trackBlockExplorerLinkClicked)).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        location: 'bridge_transaction_details',
        url: expect.stringContaining('etherscan.io'),
      }),
    );
  });

  it('should navigate to webview when destination chain explorer button is pressed', () => {
    const { getByText } = renderScreen(
      () => <BlockExplorersModal />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: mockState },
    );

    const destExplorerButton = getByText('Optimistic');
    fireEvent.press(destExplorerButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: expect.objectContaining({
        url: expect.stringContaining('optimistic.etherscan.io'),
      }),
    });
  });
});
