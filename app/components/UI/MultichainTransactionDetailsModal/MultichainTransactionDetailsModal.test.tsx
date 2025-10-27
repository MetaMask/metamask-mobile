import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ParamListBase, NavigationProp } from '@react-navigation/native';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import MultichainTransactionDetailsModal from './MultichainTransactionDetailsModal';
import { MultichainTransactionDisplayData } from '../../hooks/useMultichainTransactionDisplay';

// Mock react-native-modal to capture onModalHide callback
let mockOnModalHide: (() => void) | undefined;
jest.mock('react-native-modal', () => {
  const MockModal = ({
    children,
    onModalHide,
    ...props
  }: {
    children: React.ReactNode;
    onModalHide?: () => void;
    isVisible: boolean;
  }) => {
    mockOnModalHide = onModalHide;
    return props.isVisible ? children : null;
  };
  return MockModal;
});

const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));
jest.mock('../../../util/date', () => ({
  toDateFormat: jest.fn(() => 'Mar 15, 2025'),
}));
jest.mock('../../../util/address', () => ({
  formatAddress: jest.fn(
    (address) =>
      address.substring(0, 6) + '...' + address.substring(address.length - 4),
  ),
}));
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));
jest.mock('../../../core/Multichain/utils', () => ({
  getAddressUrl: jest.fn(() => 'https://solscan.io/account/123'),
  getTransactionUrl: jest.fn(() => 'https://solscan.io/tx/123'),
}));

describe('MultichainTransactionDetailsModal', () => {
  const mockNavigation = { navigate: jest.fn() };
  const mockOnClose = jest.fn();
  const mockTransaction: Transaction = {
    id: 'tx-123',
    chain: 'solana:mainnet',
    account: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV',
    from: [
      { address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV', asset: null },
    ],
    to: [
      { address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY', asset: null },
    ],
    type: TransactionType.Send,
    timestamp: 1742313600000,
    status: 'confirmed',
    events: [],
    fees: [],
  };
  const mockDisplayData: MultichainTransactionDisplayData = {
    to: {
      address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY',
      amount: '10',
      unit: 'SOL',
    },
    from: {
      address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV',
      amount: '10',
      unit: 'SOL',
    },
    baseFee: {
      amount: '0.000005',
      unit: 'SOL',
    },
    priorityFee: {
      amount: '0.000001',
      unit: 'SOL',
    },
    isRedeposit: false,
    title: 'Test Send',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnModalHide = undefined;
  });

  it('renders correctly a transaction', () => {
    const { getByText } = render(
      <MultichainTransactionDetailsModal
        isVisible
        onClose={mockOnClose}
        transaction={mockTransaction}
        displayData={mockDisplayData}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText('Test Send')).toBeTruthy();
    expect(getByText('Mar 15, 2025')).toBeTruthy();
    expect(getByText('transactions.transaction_id')).toBeTruthy();
    expect(getByText('transactions.from')).toBeTruthy();
    expect(getByText('transactions.to')).toBeTruthy();
    expect(getByText('transactions.amount')).toBeTruthy();
    expect(getByText('10 SOL')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByTestId } = render(
      <MultichainTransactionDetailsModal
        isVisible
        onClose={mockOnClose}
        transaction={mockTransaction}
        displayData={mockDisplayData}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    const closeButton = getByTestId('transaction-details-close-button');
    fireEvent.press(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders network fees when present', () => {
    const { getByText } = render(
      <MultichainTransactionDetailsModal
        isVisible
        onClose={mockOnClose}
        transaction={mockTransaction}
        displayData={mockDisplayData}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText('transactions.network_fee')).toBeTruthy();
    expect(getByText('0.000005 SOL')).toBeTruthy();
    expect(getByText('transactions.multichain_priority_fee')).toBeTruthy();
    expect(getByText('0.000001 SOL')).toBeTruthy();
  });

  it('navigates to block explorer when view details is pressed', async () => {
    const { getByText } = render(
      <MultichainTransactionDetailsModal
        isVisible
        onClose={mockOnClose}
        transaction={mockTransaction}
        displayData={mockDisplayData}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    const viewDetailsButton = getByText('networks.view_details');

    await act(async () => {
      fireEvent.press(viewDetailsButton);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Navigation should not happen immediately
    expect(mockNavigation.navigate).not.toHaveBeenCalled();

    // Simulate modal hide event
    await act(async () => {
      mockOnModalHide?.();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: 'https://solscan.io/tx/123' },
    });
  });

  it('navigates to address explorer when address link is pressed', async () => {
    const { getAllByText } = render(
      <MultichainTransactionDetailsModal
        isVisible
        onClose={mockOnClose}
        transaction={mockTransaction}
        displayData={mockDisplayData}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    const fromAddressLinks = getAllByText('7RoSF9...zZNV');

    await act(async () => {
      fireEvent.press(fromAddressLinks[0]);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Navigation should not happen immediately
    expect(mockNavigation.navigate).not.toHaveBeenCalled();

    // Simulate modal hide event
    await act(async () => {
      mockOnModalHide?.();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: 'https://solscan.io/account/123' },
    });
  });

  it('does not navigate when modal closes without pressing any link', async () => {
    render(
      <MultichainTransactionDetailsModal
        isVisible
        onClose={mockOnClose}
        transaction={mockTransaction}
        displayData={mockDisplayData}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    // Simulate modal hide event without pressing any buttons
    await act(async () => {
      mockOnModalHide?.();
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });
});
