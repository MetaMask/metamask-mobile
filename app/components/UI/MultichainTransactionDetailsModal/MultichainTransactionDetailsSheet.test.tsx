import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import MultichainTransactionDetailsSheet from './MultichainTransactionDetailsSheet';
import type { MultichainTransactionDisplayData } from '../../hooks/useMultichainTransactionDisplay';
import type { Transaction } from '@metamask/keyring-api';

const mockNavigate = jest.fn();
const mockOnCloseBottomSheet = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => mockUseRoute(),
}));

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
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
          return <View>{children}</View>;
        },
      ),
    };
  },
);

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose: () => void;
    }) => (
      <View>
        <TouchableOpacity testID="bottomsheet-close" onPress={onClose} />
        {children}
      </View>
    );
  },
);

jest.mock('../../../core/Multichain/utils', () => ({
  getTransactionUrl: jest.fn(
    (id: string, chain: string) =>
      `https://explorer.example.com/tx/${id}?chain=${chain}`,
  ),
  getAddressUrl: jest.fn(
    (address: string, chain: string) =>
      `https://explorer.example.com/address/${address}?chain=${chain}`,
  ),
}));

const mockDisplayData: MultichainTransactionDisplayData = {
  title: 'Send ETH',
  isRedeposit: false,
  from: {
    address: '0xabc123def456abc123def456abc123def456abc1',
    amount: '0.5',
    unit: 'ETH',
  },
  to: {
    address: '0xdef456abc123def456abc123def456abc123def4',
    amount: '0.5',
    unit: 'ETH',
  },
  baseFee: { amount: '0.001', unit: 'ETH' },
  priorityFee: { amount: '0.0001', unit: 'ETH' },
};

const mockTransaction = {
  id: 'tx-hash-123',
  timestamp: 1700000000,
  chain: 'eip155:1',
  status: 'confirmed',
  account: '0xabc123def456abc123def456abc123def456abc1',
  type: 'send',
} as unknown as Transaction;

const renderSheet = () =>
  renderScreen(
    MultichainTransactionDetailsSheet,
    { name: 'MultichainTransactionDetailsSheet' },
    { state: { engine: { backgroundState } } },
  );

const defaultRouteParams = {
  params: { displayData: mockDisplayData, transaction: mockTransaction },
};

describe('MultichainTransactionDetailsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue(defaultRouteParams);
  });

  it('renders the transaction title', () => {
    const { getByText } = renderSheet();
    expect(getByText('Send ETH')).toBeTruthy();
  });

  it('renders the transaction status row', () => {
    const { getByTestId } = renderSheet();
    expect(
      getByTestId(`transaction-status-${mockTransaction.id}`),
    ).toBeTruthy();
  });

  it('renders the from address row', () => {
    const { getByText } = renderSheet();
    // formatAddress shortens it — just check the label exists
    expect(getByText('From')).toBeTruthy();
  });

  it('renders the to address row', () => {
    const { getByText } = renderSheet();
    expect(getByText('To')).toBeTruthy();
  });

  it('renders the amount row', () => {
    const { getByText } = renderSheet();
    expect(getByText('Amount')).toBeTruthy();
    expect(getByText('0.5 ETH')).toBeTruthy();
  });

  it('renders the network fee row', () => {
    const { getByText } = renderSheet();
    expect(getByText('Network fee')).toBeTruthy();
    expect(getByText('0.001 ETH')).toBeTruthy();
  });

  it('renders the priority fee row', () => {
    const { getByText } = renderSheet();
    expect(getByText('0.0001 ETH')).toBeTruthy();
  });

  it('closes the sheet when close button is pressed', () => {
    const { getByTestId } = renderSheet();
    fireEvent.press(getByTestId('bottomsheet-close'));
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('renders without from/to/fees when they are absent', () => {
    mockUseRoute.mockReturnValue({
      params: {
        displayData: { title: 'Receive' },
        transaction: mockTransaction,
      },
    });
    const { getByText, queryByText } = renderSheet();
    expect(getByText('Receive')).toBeTruthy();
    expect(queryByText('From')).toBeNull();
    expect(queryByText('To')).toBeNull();
    expect(queryByText('Network fee')).toBeNull();
  });
});
