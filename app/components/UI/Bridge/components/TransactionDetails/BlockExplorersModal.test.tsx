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
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../util/navigation/types';

type Props = StackScreenProps<RootParamList, 'TransactionDetailsBlockExplorer'>;

describe('BlockExplorersModal', () => {
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

  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    isFocused: jest.fn(),
    canGoBack: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    setParams: jest.fn(),
    getId: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  } as unknown as Props['navigation'];

  const mockProps = {
    route: {
      params: {
        evmTxMeta: mockTx,
      },
      key: 'test-route-key',
      name: 'TransactionDetailsBlockExplorer' as const,
    },
    navigation: mockNavigation,
  };

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
      () => <BlockExplorersModal {...mockProps} />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: mockState },
    );
    expect(getByText('View on block explorer')).toBeTruthy();
  });

  it('should display both source and destination chain block explorer buttons', () => {
    const { getAllByText } = renderScreen(
      () => <BlockExplorersModal {...mockProps} />,
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
      () => <BlockExplorersModal {...mockProps} />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: modifiedState },
    );
    const etherscanButtons = getAllByText('Etherscan');
    expect(etherscanButtons).toHaveLength(1);
  });
});
