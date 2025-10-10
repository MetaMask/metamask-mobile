import React from 'react';
import { BridgeTransactionDetails } from './TransactionDetails';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { initialState } from '../../_mocks_/initialState';

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

  const mockState = initialState;

  it('renders without crashing', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails route={{ params: { evmTxMeta: mockTx } }} />
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
        <BridgeTransactionDetails route={{ params: { evmTxMeta: mockTx } }} />
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
        <BridgeTransactionDetails route={{ params: { evmTxMeta: mockTx } }} />
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
        <BridgeTransactionDetails route={{ params: { evmTxMeta: mockTx } }} />
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
        <BridgeTransactionDetails route={{ params: { evmTxMeta: mockTx } }} />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText(/view on block explorer/i)).toBeTruthy();
  });
});
