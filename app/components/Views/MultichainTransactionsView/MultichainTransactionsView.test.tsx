import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { fireEvent, render } from '@testing-library/react-native';
import {
  BtcScope,
  SolScope,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import MultichainTransactionsView from './MultichainTransactionsView';
import { selectNonEvmTransactions } from '../../../selectors/multichain';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { configureUseAnalyticsExternalLinkMock } from '../../../util/test/analyticsMock';
import { selectIsActivityRedesignEnabled } from '../../../selectors/featureFlagController/activityRedesign';
import { ActivityListItemRow } from '../../UI/ActivityListItemRow/ActivityListItemRow';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
jest.useFakeTimers();

jest.mock('../../../util/analytics/externalLinkTracking', () => ({
  ...jest.requireActual('../../../util/analytics/externalLinkTracking'),
  trackBlockExplorerLinkClicked: jest.fn(),
}));
import { trackBlockExplorerLinkClicked } from '../../../util/analytics/externalLinkTracking';
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
jest.mock('../../UI/ActivityListItemRow/ActivityListItemRow', () => ({
  ActivityListItemRow: jest.fn(() => null),
}));
jest.mock('../../../selectors/featureFlagController/activityRedesign', () => ({
  selectIsActivityRedesignEnabled: jest.fn(() => false),
}));
jest.mock('../../hooks/useMultichainTransactionDisplay', () => ({
  useMultichainTransactionDisplay: jest.fn(() => ({
    title: 'Send TRX',
    to: { amount: '1', unit: 'TRX' },
    isRedeposit: false,
  })),
}));
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

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
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
      status: TransactionStatus.Confirmed,
      timestamp: 1742313600,
    },
    {
      id: 'tx-456',
      chainId: 'solana:mainnet',
      from: [{ address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' }],
      to: [{ address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' }],
      value: '2000000000',
      type: TransactionType.Receive,
      status: TransactionStatus.Confirmed,
      timestamp: 1742400000,
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

    configureUseAnalyticsExternalLinkMock();
    mockUseTheme.mockReturnValue({
      colors: {
        background: {
          alternative: 'background-alternative',
          default: 'background-default',
        },
        border: { muted: 'border-muted' },
        icon: { default: 'icon-default' },
        primary: { default: 'primary-default' },
        text: {
          alternative: 'text-alternative',
          default: 'text-default',
        },
      },
      typography: {},
    });

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
      if (selector === selectIsActivityRedesignEnabled) {
        return false;
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

  it('renders redesigned activity rows for asset details when activity redesign is enabled', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNonEvmTransactions) {
        return { transactions: mockTransactions };
      }
      if (selector === selectIsActivityRedesignEnabled) {
        return true;
      }
      return null;
    });

    const { queryAllByTestId } = customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
        location={TransactionDetailLocation.AssetDetails}
      />,
    );

    expect(ActivityListItemRow).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 1,
        item: expect.objectContaining({
          type: 'send',
        }),
      }),
      undefined,
    );
    expect(ActivityListItemRow.mock.calls[0][0]).not.toHaveProperty('title');
    expect(queryAllByTestId('activity-list-date-header')).toHaveLength(2);
  });

  it('does not render view more link for bitcoin activity', async () => {
    const { queryByText } = customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={BtcScope.Mainnet}
      />,
    );

    expect(
      queryByText('transactions.view_full_history_on'),
    ).not.toBeOnTheScreen();
  });

  it('tracks External Link Clicked when view more explorer link is pressed', () => {
    customRender(
      <MultichainTransactionsView
        selectedAddress={mockSelectedAddress}
        chainId={SolScope.Mainnet}
      />,
    );

    const { default: MockButton } = jest.requireMock(
      '../../../component-library/components/Buttons/Button',
    ) as { default: { lastProps: ButtonProps } };

    MockButton.lastProps.onPress?.();

    expect(jest.mocked(trackBlockExplorerLinkClicked)).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        location: 'multichain_activity_tab',
        url: 'https://solscan.io/account/testaddress',
      }),
    );
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: 'https://solscan.io/account/testaddress' },
    });
  });
});
