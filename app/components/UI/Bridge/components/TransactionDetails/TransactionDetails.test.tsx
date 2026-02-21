import React from 'react';
import { BridgeTransactionDetails } from './TransactionDetails';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { initialState } from '../../_mocks_/initialState';
import { fireEvent } from '@testing-library/react-native';
import { Transaction } from '@metamask/keyring-api';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    }),
  };
});

describe('BridgeTransactionDetails', () => {
  const mockEVMTx = {
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

  const mockMultiChainTx = {
    id: 'solana-tx-hash-123', // Must match status.srcChain.txHash
    status: 'confirmed',
    type: 'swap',
    from: [
      {
        address: 'So11111111111111111111111111111111111111112',
        asset: null,
      },
    ],
    to: [
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        asset: null,
      },
    ],
    chain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    events: [],
    fees: [],
    account: 'pXwSggYaFeUryz86UoCs9ugZ4VWoZ7R1U5CVhxYjL61', // Solana account from initialState
    timestamp: Date.now(),
  } as Transaction;

  const mockState = initialState;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText('Status')).toBeTruthy();
  });

  it('displays source and destination token information', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText(/1\.00000\s+TOKEN1/)).toBeTruthy();
    expect(getByText(/2\.00000\s+TOKEN2/)).toBeTruthy();
  });

  it('displays submission date', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText(/date/i)).toBeTruthy();
  });

  it('shows total gas fee', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText(/total gas fee/i)).toBeTruthy();
  });

  it('displays block explorer button', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText(/view on block explorer/i)).toBeTruthy();
  });

  it('navigates directly to browser for same-chain swaps with multiChainTx', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { multiChainTx: mockMultiChainTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );

    const blockExplorerButton = getByText(/view on block explorer/i);
    fireEvent.press(blockExplorerButton);

    // Should navigate to browser, not to the modal
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BROWSER.HOME,
      expect.objectContaining({
        screen: Routes.BROWSER.VIEW,
        params: expect.objectContaining({
          newTabUrl: expect.stringContaining('solana-tx-hash-123'),
        }),
      }),
    );
  });
});
