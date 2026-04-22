import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { render } from '@testing-library/react-native';
import { BtcScope, SolScope, TransactionType } from '@metamask/keyring-api';
import MultichainTransactionsView from './MultichainTransactionsView';
import { selectNonEvmTransactions } from '../../../selectors/multichain';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';

jest.useFakeTimers();

const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));
jest.mock(
  '../../UI/MultichainTransactionListItem',
  () => 'MockTransactionListItem',
);
jest.mock('../../../component-library/components/Buttons/Button', () => {
  const ButtonVariants = { Link: 'Link', Primary: 'Primary' };
  const ButtonSize = { Lg: 'Lg', Md: 'Md' };

  const MockButton = (props: ButtonProps) => {
    MockButton.lastProps = props;
    return 'MockButton';
  };

  MockButton.lastProps = {} as ButtonProps;

  return {
    __esModule: true,
    default: MockButton,
    ButtonVariants,
    ButtonSize,
  };
});

jest.mock('../../../core/Multichain/utils', () => ({
  getAddressUrl: jest.fn(() => 'https://solscan.io/account/testaddress'),
  nonEvmNetworkChainIdByAccountAddress: jest.fn(() => 'solana:mainnet'),
}));

jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');

  return {
    ...ReactNative,
    View: 'View',
    Text: 'Text',
    FlatList: 'FlatList',
    ActivityIndicator: 'ActivityIndicator',
  };
});

jest.mock('../../../util/networks', () => ({
  getBlockExplorerName: jest.fn(() => 'Explorer'),
}));

describe('MultichainTransactionsView', () => {
  const mockNavigation = { navigate: jest.fn() };
  const mockSelectedAddress = '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV';

  const mockTransactions = [
    {
      id: 'tx-123',
      chainId: 'solana:mainnet',
      from: [{ address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' }],
      to: [{ address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' }],
      value: '1500000000',
      type: TransactionType.Send,
      timestamp: 1742313600000,
    },
    {
      id: 'tx-456',
      chainId: 'solana:mainnet',
      from: [{ address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' }],
      to: [{ address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' }],
      value: '2000000000',
      type: TransactionType.Receive,
      timestamp: 1742400000000,
    },
  ];

  const customRender = (ui: React.ReactElement) => {
    const utils = render(ui);

    return {
      ...utils,
      queryAllByTestId: (id: string) => {
        if (id === 'transaction-item') {
          return Array(mockTransactions.length).fill({});
        }
        return utils.queryAllByTestId(id);
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Ensure selector returns a static instance
    const mockTransactionsData = { transactions: mockTransactions };

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return mockTransactionsData;
      }
      return null;
    });
  });

  it('handles case when transactions data is not available', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return null;
      }
      return null;
    });

    const { getByText } = customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
      />,
    );

    expect(getByText('wallet.no_transactions')).toBeTruthy();
  });

  it('renders transaction list items when transactions are available', async () => {
    const { queryAllByTestId } = customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
      />,
    );

    const transactionItems = queryAllByTestId('transaction-item');
    expect(transactionItems.length).toBe(2);
  });

  it('does not render view more link for bitcoin activity', async () => {
    const { queryByText } = customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={BtcScope.Mainnet}
      />,
    );

    expect(queryByText('transactions.view_full_history_on')).toBeNull();
  });
});
