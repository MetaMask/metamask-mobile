import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import { MoneyApiActivityDetailsView } from './MoneyApiActivityDetailsView';
import type {
  AccountsApiActivity,
  NeobankBankTransferActivity,
} from '../../types/moneyActivity';
import {
  CardMerchantCategory,
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';

const token = {
  address: '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex,
  symbol: 'mUSD',
  decimals: 6,
};

const card: AccountsApiActivity = {
  kind: 'card',
  hash: '0x2b45bda071d8feff265c541e251a5e035e5f55270f8ad288dcd80f6740793847' as Hex,
  time: 1780574031000,
  chainId: '0x8f' as Hex,
  token,
  amount: '5381986',
  paidTo: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e' as Hex,
};

const cashback: AccountsApiActivity = {
  kind: 'cashback',
  hash: '0xback' as Hex,
  time: 1780574031000,
  chainId: '0x8f' as Hex,
  token,
  amount: '300000',
  receivedFrom: '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0' as Hex,
};

const refund: AccountsApiActivity = {
  kind: 'refund',
  hash: '0xrefund' as Hex,
  time: 1780574031000,
  chainId: '0x8f' as Hex,
  token,
  amount: '1500000',
  receivedFrom: '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0' as Hex,
};

const bankTransfer: AccountsApiActivity = {
  kind: 'bank_transfer',
  hash: '0xbank' as Hex,
  time: 1780574031000,
  chainId: '0x8f' as Hex,
  token,
  amount: '15009500',
  receivedFrom: '0x798eee806e806a0a26bc52526428dd3692217881' as Hex,
  status: 'confirmed',
};

const declinedCardTransaction: CardTransaction = {
  id: 'declined-provider-id',
  providerId: 'baanx',
  timestamp: 1780574031000,
  status: CardTransactionStatus.Failed,
  type: CardTransactionType.Purchase,
  isDebit: true,
  billingAmount: { value: '12.50', currency: 'USD' },
  reference: 'ref-declined-1',
  merchant: {
    name: 'Coffee Shop',
    city: 'Berlin',
    countryCode: 'DE',
    category: CardMerchantCategory.Food,
  },
  declineReason: {
    code: 'INSUFFICIENT_FUNDS',
    message: 'You attempted this USDC transaction with a balance of 0.00 USDC',
  },
  fundingSources: [],
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockBlockExplorerFlag = true;
let mockPendingActivityEnabled = true;
let mockLiveNeobankActivity: NeobankBankTransferActivity[] = [];
let mockRouteParams:
  | {
      activity?: AccountsApiActivity;
      enrichment?: CardTransaction;
      cardTransaction?: CardTransaction;
      neobankActivity?: NeobankBankTransferActivity;
    }
  | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({
    name: 'MoneyCardTransactionDetails',
    params: mockRouteParams,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: () => ({}),
}));

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: () => ({
    address: '0xd663e49775d776300aa45ac2a51f0431bb459282',
  }),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'usd',
  selectCurrencyRates: () => ({}),
}));

jest.mock('../../selectors/featureFlags', () => ({
  selectMoneyEnableActivityDetailsBlockexplorerLinkFlag: () =>
    mockBlockExplorerFlag,
  selectMoneyVbaPendingActivityEnabled: () => mockPendingActivityEnabled,
}));

jest.mock('../../hooks/useNeobankAutorampActivity', () => ({
  useNeobankAutorampActivity: () => ({
    activity: mockLiveNeobankActivity,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../hooks/useMoneyAccountTransactions', () => ({
  useMoneyAccountTransactions: () => ({
    moneyAddress: '0xd663e49775d776300aa45ac2a51f0431bb459282',
  }),
}));

jest.mock('../../../../Views/confirmations/hooks/useNetworkInfo', () => ({
  __esModule: true,
  default: () => ({ networkName: 'Monad', networkImage: undefined }),
}));

const mockGetBlockExplorerTxUrl = jest.fn(() => ({
  url: 'https://monadscan.com/tx/0x2b45',
  title: 'monadscan.com',
}));
jest.mock('../../../../../util/networks', () => ({
  findBlockExplorerUrlForChain: jest.fn(() => 'https://monadscan.com'),
  getBlockExplorerTxUrl: (...args: unknown[]) =>
    mockGetBlockExplorerTxUrl(...(args as [])),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');
  return {
    ...actual,
    HeaderStandard: ({
      title,
      onBack,
    }: {
      title: string;
      onBack: () => void;
    }) => (
      <View>
        <RNText testID="header-title">{title}</RNText>
        <RNText testID="header-back" onPress={onBack}>
          Back
        </RNText>
      </View>
    ),
    AvatarToken: ({ testID }: { testID?: string }) => (
      <View testID={testID ?? 'avatar-token'} />
    ),
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children: React.ReactNode;
      onPress: () => void;
      testID?: string;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <RNText>{children}</RNText>
      </Pressable>
    ),
  };
});

jest.mock('../../../../Views/confirmations/components/token-icon', () => ({
  TokenIcon: () => null,
  TokenIconVariant: { Hero: 'hero' },
}));
jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  () => () => null,
);
jest.mock('../../../Name/Name', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ value }: { value: string }) => (
      <RNText testID="counterparty-name">{value}</RNText>
    ),
  };
});

jest.mock(
  '../../../../Views/confirmations/components/UI/copy-button/copy-button',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ testID }: { testID?: string }) => (
        <View testID={testID ?? 'copy-button'} />
      ),
    };
  },
);

jest.mock('../../../../../util/intl', () => ({
  getIntlDateTimeFormatter: (_locale: string, _opts?: object) => ({
    format: () => 'Jun',
  }),
  getIntlNumberFormatter: (locale: string, opts?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale, opts),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => key,
}));

const mockRefetchApiActivity = jest.fn();
let mockApiActivity: unknown[] = [];
jest.mock('../../hooks/useMoneyAccountApiActivity', () => ({
  useMoneyAccountApiActivity: () => ({
    activity: mockApiActivity,
    refetch: mockRefetchApiActivity,
    watermark: Number.NEGATIVE_INFINITY,
    isComplete: true,
    pageCount: 1,
    hasMore: false,
    loadMore: jest.fn(),
    isLoadingMore: false,
    isLoading: false,
    error: false,
  }),
}));

jest.mock('../../../../Views/confirmations/components/progress-list', () => {
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');
  return {
    ProgressList: ({ children }: { children: React.ReactNode }) => (
      <View testID="progress-list">{children}</View>
    ),
    ProgressListItem: ({
      title,
      subtitle,
      severity,
      buttonIcon,
      onButtonPress,
    }: {
      title: string;
      subtitle: string;
      severity?: string;
      buttonIcon?: string;
      onButtonPress?: () => void;
    }) => (
      <View testID={`progress-list-item-${severity ?? 'success'}`}>
        <RNText>{title}</RNText>
        <RNText>
          {severity === 'warning'
            ? 'transaction.pending'
            : severity === 'error'
              ? 'transaction.failed'
              : subtitle}
        </RNText>
        {buttonIcon ? <View testID="progress-list-item-icon" /> : null}
        {onButtonPress ? (
          <Pressable testID="block-explorer-button" onPress={onButtonPress} />
        ) : null}
      </View>
    ),
  };
});

describe('MoneyApiActivityDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBlockExplorerFlag = true;
    mockRouteParams = { activity: card };
    mockApiActivity = [];
  });

  describe('card spend', () => {
    it('renders the shared transaction details title', () => {
      const { getByTestId } = render(<MoneyApiActivityDetailsView />);
      expect(getByTestId('header-title')).toHaveTextContent(
        'card.transactions.details_title',
      );
    });

    it('renders the spent amount with a minus sign formatted to 2 decimals', () => {
      const { getByText } = render(<MoneyApiActivityDetailsView />);
      expect(getByText(/-5\.38 mUSD/)).toBeTruthy();
    });

    it('renders the "You spent" label', () => {
      const { getByText } = render(<MoneyApiActivityDetailsView />);
      expect(getByText('money.api_activity_details.you_spent')).toBeTruthy();
    });

    it('renders the Money account hero icon', () => {
      const { getByTestId } = render(<MoneyApiActivityDetailsView />);
      expect(getByTestId('money-account-hero-icon')).toBeTruthy();
    });

    it('does not render the Report Transaction button', () => {
      const { queryByTestId, queryByText } = render(
        <MoneyApiActivityDetailsView />,
      );
      expect(
        queryByTestId('card-transaction-details-report-button'),
      ).toBeNull();
      expect(queryByText('transaction_details.label.from')).toBeNull();
      expect(queryByText('transaction_details.label.network')).toBeNull();
    });

    it('renders a copyable transaction ID from enrichment reference', () => {
      mockRouteParams = {
        activity: card,
        enrichment: {
          id: 'baanx-id',
          providerId: 'baanx',
          timestamp: card.time,
          status: CardTransactionStatus.Completed,
          type: CardTransactionType.Purchase,
          isDebit: true,
          billingAmount: { value: '5.38', currency: 'USD' },
          reference: '1000131559458',
          fundingSources: [],
        },
      };
      const { getByTestId, getByText } = render(
        <MoneyApiActivityDetailsView />,
      );
      expect(getByText('transaction.transaction_id')).toBeTruthy();
      expect(getByText('1000131559458')).toBeTruthy();
      expect(getByTestId('card-transaction-details-copy-id')).toBeTruthy();
    });

    it('hides the transaction ID row when enrichment has no reference', () => {
      const { queryByTestId, queryByText } = render(
        <MoneyApiActivityDetailsView />,
      );
      expect(queryByText('transaction.transaction_id')).toBeNull();
      expect(queryByTestId('card-transaction-details-copy-id')).toBeNull();
    });

    it('opens the block explorer when the button is pressed', () => {
      const { getByTestId } = render(<MoneyApiActivityDetailsView />);

      fireEvent.press(getByTestId('card-transaction-details-explorer-button'));

      expect(mockGetBlockExplorerTxUrl).toHaveBeenCalledWith(
        expect.anything(),
        card.hash,
        'https://monadscan.com',
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        'Webview',
        expect.objectContaining({
          params: {
            url: 'https://monadscan.com/tx/0x2b45',
            title: 'monadscan.com',
          },
        }),
      );
    });

    it('renders merchant name, category, and location from enrichment', () => {
      mockRouteParams = {
        activity: card,
        enrichment: {
          id: 'baanx-id',
          providerId: 'baanx',
          timestamp: card.time,
          status: CardTransactionStatus.Completed,
          type: CardTransactionType.Purchase,
          isDebit: true,
          billingAmount: { value: '5.38', currency: 'USD' },
          merchant: {
            name: 'Metro Market',
            city: 'Lisbon',
            countryCode: 'PT',
            category: CardMerchantCategory.Food,
          },
          fundingSources: [],
        },
      };

      const { getByText } = render(<MoneyApiActivityDetailsView />);

      expect(getByText('Metro Market')).toBeTruthy();
      expect(getByText('card.transactions.categories.food')).toBeTruthy();
      expect(getByText('Lisbon, PT')).toBeTruthy();
    });

    it('omits merchant rows when enrichment has no merchant', () => {
      mockRouteParams = {
        activity: card,
        enrichment: {
          id: 'baanx-id',
          providerId: 'baanx',
          timestamp: card.time,
          status: CardTransactionStatus.Completed,
          type: CardTransactionType.Purchase,
          isDebit: true,
          billingAmount: { value: '5.38', currency: 'USD' },
          fundingSources: [],
        },
      };

      const { queryByText } = render(<MoneyApiActivityDetailsView />);

      expect(queryByText('card.transactions.merchant')).toBeNull();
      expect(queryByText('card.transactions.category')).toBeNull();
      expect(queryByText('card.transactions.location')).toBeNull();
    });
  });

  describe('declined card provider transaction', () => {
    beforeEach(() => {
      mockRouteParams = { cardTransaction: declinedCardTransaction };
    });

    it('renders failed status and spent hero copy', () => {
      const { getByText } = render(<MoneyApiActivityDetailsView />);

      expect(getByText('money.api_activity_details.you_spent')).toBeTruthy();
      expect(getByText('money.transaction.failed')).toBeTruthy();
    });

    it('renders the Money account hero icon, not the Card primary token', () => {
      // Declines have empty fundingSources; the Money path must not fall back
      // to selectCardPrimaryToken (e.g. USDC).
      const { getByTestId } = render(<MoneyApiActivityDetailsView />);

      expect(getByTestId('money-account-hero-icon')).toBeTruthy();
    });

    it('renders merchant, category, location, and decline reason', () => {
      const { getByText } = render(<MoneyApiActivityDetailsView />);

      expect(getByText('Coffee Shop')).toBeTruthy();
      expect(getByText('card.transactions.categories.food')).toBeTruthy();
      expect(getByText('Berlin, DE')).toBeTruthy();
      expect(
        getByText('card.transactions.decline_reasons.insufficient_funds'),
      ).toBeTruthy();
    });

    it('uses reference as the transaction id when present', () => {
      const { getByText, getByTestId } = render(
        <MoneyApiActivityDetailsView />,
      );

      expect(getByText('ref-declined-1')).toBeTruthy();
      expect(getByTestId('card-transaction-details-copy-id')).toBeTruthy();
    });

    it('falls back to the provider id when reference is missing', () => {
      mockRouteParams = {
        cardTransaction: {
          ...declinedCardTransaction,
          reference: undefined,
        },
      };

      const { getByText } = render(<MoneyApiActivityDetailsView />);

      expect(getByText('declined-provider-id')).toBeTruthy();
    });

    it('hides the explorer button when there is no funding tx hash', () => {
      const { queryByTestId } = render(<MoneyApiActivityDetailsView />);

      expect(
        queryByTestId('card-transaction-details-explorer-button'),
      ).toBeNull();
    });

    it('opens the block explorer when a funding source has a tx hash', () => {
      mockRouteParams = {
        cardTransaction: {
          ...declinedCardTransaction,
          fundingSources: [
            {
              txHash: '0xfundinghash',
              chainId: 'eip155:143',
            },
          ],
        },
      };

      const { getByTestId } = render(<MoneyApiActivityDetailsView />);

      fireEvent.press(getByTestId('card-transaction-details-explorer-button'));

      expect(mockGetBlockExplorerTxUrl).toHaveBeenCalledWith(
        expect.anything(),
        '0xfundinghash',
        'https://monadscan.com',
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        'Webview',
        expect.objectContaining({
          params: {
            url: 'https://monadscan.com/tx/0x2b45',
            title: 'monadscan.com',
          },
        }),
      );
    });

    it('hides the explorer button when the block-explorer flag is off', () => {
      mockBlockExplorerFlag = false;
      mockRouteParams = {
        cardTransaction: {
          ...declinedCardTransaction,
          fundingSources: [
            {
              txHash: '0xfundinghash',
              chainId: 'eip155:143',
            },
          ],
        },
      };

      const { queryByTestId } = render(<MoneyApiActivityDetailsView />);

      expect(
        queryByTestId('card-transaction-details-explorer-button'),
      ).toBeNull();
    });

    it('renders completed status styling for a non-failed provider tx', () => {
      mockRouteParams = {
        cardTransaction: {
          ...declinedCardTransaction,
          status: CardTransactionStatus.Completed,
          declineReason: undefined,
        },
      };

      const { getByText, queryByText } = render(
        <MoneyApiActivityDetailsView />,
      );

      expect(getByText('card.transactions.completed')).toBeTruthy();
      expect(queryByText('money.transaction.failed')).toBeNull();
    });

    it('renders the Network fee row labeled with mUSD when feeAmount is present', () => {
      mockRouteParams = {
        cardTransaction: {
          ...declinedCardTransaction,
          feeAmount: { value: '0.02', currency: 'USDC' },
        },
      };

      const { getByText } = render(<MoneyApiActivityDetailsView />);

      expect(getByText('card.transactions.network_fee')).toBeTruthy();
      expect(getByText('0.02 mUSD')).toBeTruthy();
    });
  });

  describe('cashback', () => {
    beforeEach(() => {
      mockRouteParams = { activity: cashback };
    });

    it('renders the mUSD back title', () => {
      const { getByTestId } = render(<MoneyApiActivityDetailsView />);
      expect(getByTestId('header-title')).toHaveTextContent(
        'money.transaction.musd_back',
      );
    });

    it('renders the earned amount with a plus sign', () => {
      const { getByText } = render(<MoneyApiActivityDetailsView />);
      expect(getByText(/\+0\.30 mUSD/)).toBeTruthy();
    });

    it('renders the "You earned" label', () => {
      const { getByText } = render(<MoneyApiActivityDetailsView />);
      expect(getByText('money.api_activity_details.you_earned')).toBeTruthy();
    });

    it('renders the Money account hero icon', () => {
      const { getByTestId } = render(<MoneyApiActivityDetailsView />);
      expect(getByTestId('money-account-hero-icon')).toBeTruthy();
    });

    it('renders the "Received from" row with the sender', () => {
      const { getByText, getByTestId } = render(
        <MoneyApiActivityDetailsView />,
      );
      expect(
        getByText('money.api_activity_details.received_from'),
      ).toBeTruthy();
      expect(getByTestId('counterparty-name')).toHaveTextContent(
        cashback.receivedFrom,
      );
    });

    it('renders the network row', () => {
      const { getByText } = render(<MoneyApiActivityDetailsView />);
      expect(getByText('Monad')).toBeTruthy();
    });

    it('opens the block explorer when the button is pressed', () => {
      const { getByTestId } = render(<MoneyApiActivityDetailsView />);

      fireEvent.press(getByTestId('card-transaction-details-explorer-button'));

      expect(mockGetBlockExplorerTxUrl).toHaveBeenCalledWith(
        expect.anything(),
        cashback.hash,
        'https://monadscan.com',
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        'Webview',
        expect.objectContaining({
          params: {
            url: 'https://monadscan.com/tx/0x2b45',
            title: 'monadscan.com',
          },
        }),
      );
    });
  });

  describe('bank_transfer', () => {
    beforeEach(() => {
      mockRouteParams = { activity: bankTransfer };
    });

    it('renders the Deposited title and USD hero amount without a hero label', () => {
      const { getByTestId, getByText, queryByText } = render(
        <MoneyApiActivityDetailsView />,
      );
      expect(getByTestId('header-title')).toHaveTextContent(
        'money.transaction.deposited',
      );
      expect(getByText('+US$15.01')).toBeOnTheScreen();
      expect(
        queryByText('money.api_activity_details.you_deposited'),
      ).not.toBeOnTheScreen();
    });

    it('hides the network and received-from rows', () => {
      const { queryByText } = render(<MoneyApiActivityDetailsView />);

      expect(
        queryByText('transaction_details.label.network'),
      ).not.toBeOnTheScreen();
      expect(
        queryByText('money.api_activity_details.received_from'),
      ).not.toBeOnTheScreen();
    });

    it('renders the fees and total section', () => {
      const { getByText } = render(<MoneyApiActivityDetailsView />);

      expect(
        getByText('money.api_activity_details.transaction_fees'),
      ).toBeOnTheScreen();
      expect(
        getByText('money.api_activity_details.paid_by_metamask'),
      ).toBeOnTheScreen();
      expect(getByText('money.api_activity_details.total')).toBeOnTheScreen();
      expect(getByText('$15.01')).toBeOnTheScreen();
    });

    it('renders three completed steps with an explorer icon on each', () => {
      const { getByTestId, getByText, getAllByTestId, getAllByText } = render(
        <MoneyApiActivityDetailsView />,
      );

      expect(getByTestId('money-bank-transfer-steps')).toBeOnTheScreen();
      expect(
        getByText('transaction_details.label.steps_completed'),
      ).toBeOnTheScreen();
      // Paid-with row + Steps title both use this string.
      expect(
        getAllByText('money.transaction.bank_transfer').length,
      ).toBeGreaterThan(0);
      expect(
        getByText('transaction_details.title.musd_conversion'),
      ).toBeOnTheScreen();
      expect(
        getByText('transaction_details.title.money_account_deposit'),
      ).toBeOnTheScreen();
      expect(getAllByTestId('progress-list-item-success')).toHaveLength(3);
      expect(getAllByTestId('progress-list-item-icon')).toHaveLength(3);
      expect(getAllByTestId('block-explorer-button')).toHaveLength(3);
    });

    it('opens the settlement from any step', () => {
      const { getAllByTestId } = render(<MoneyApiActivityDetailsView />);

      fireEvent.press(getAllByTestId('block-explorer-button')[1]);

      expect(mockGetBlockExplorerTxUrl).toHaveBeenCalledWith(
        expect.anything(),
        bankTransfer.hash,
        'https://monadscan.com',
      );
    });

    it('does not render the full-width explorer button', () => {
      const { queryByTestId } = render(<MoneyApiActivityDetailsView />);

      expect(
        queryByTestId('card-transaction-details-explorer-button'),
      ).toBeNull();
    });

    it('does not render Steps for cashback rows', () => {
      mockRouteParams = { activity: cashback };
      const { queryByTestId } = render(<MoneyApiActivityDetailsView />);
      expect(queryByTestId('money-bank-transfer-steps')).not.toBeOnTheScreen();
    });
  });

  describe('neobank bank_transfer', () => {
    beforeEach(() => {
      mockPendingActivityEnabled = true;
      mockLiveNeobankActivity = [];
    });

    const pendingNeobank: NeobankBankTransferActivity = {
      id: 'neo-pending',
      autorampId: 'ar-1',
      status: 'Pending',
      time: 1780574031000,
      destinationAmount: '15',
    };

    it('blocks restored pending details when pending activity is disabled', () => {
      mockPendingActivityEnabled = false;
      mockRouteParams = { neobankActivity: pendingNeobank };
      render(<MoneyApiActivityDetailsView />);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('keeps all Steps pending while MoonPay pay-in is still open', () => {
      mockRouteParams = { neobankActivity: pendingNeobank };
      const {
        getByTestId,
        getByText,
        getAllByText,
        getAllByTestId,
        queryAllByTestId,
        queryByText,
      } = render(<MoneyApiActivityDetailsView />);

      expect(getByText('money.api_activity_details.pending')).toBeOnTheScreen();
      expect(
        getAllByText('money.transaction.depositing').length,
      ).toBeGreaterThan(0);
      expect(
        queryByText('money.transaction.deposit_failed'),
      ).not.toBeOnTheScreen();
      expect(
        queryByText('money.api_activity_details.you_deposited'),
      ).not.toBeOnTheScreen();
      expect(queryByText(/US\$15\.00/)).not.toBeOnTheScreen();
      expect(getByTestId('money-bank-transfer-steps')).toBeOnTheScreen();
      expect(
        getAllByText('money.transaction.bank_transfer').length,
      ).toBeGreaterThan(0);
      expect(
        getByText('transaction_details.title.musd_conversion'),
      ).toBeOnTheScreen();
      expect(
        getByText('transaction_details.title.money_account_deposit'),
      ).toBeOnTheScreen();
      expect(
        getByText('money.api_activity_details.transaction_fees'),
      ).toBeOnTheScreen();
      expect(getByText('$15.00')).toBeOnTheScreen();
      expect(getAllByTestId('progress-list-item-warning')).toHaveLength(3);
      expect(getAllByTestId('progress-list-item-icon')).toHaveLength(3);
      expect(queryAllByTestId('block-explorer-button')).toHaveLength(0);
      expect(getAllByText('transaction.pending').length).toBeGreaterThan(0);
    });

    it('leaves the total blank when a pending transfer has no known amount', () => {
      mockRouteParams = {
        neobankActivity: { ...pendingNeobank, destinationAmount: undefined },
      };

      const { getByText, queryByText } = render(
        <MoneyApiActivityDetailsView />,
      );

      expect(getByText('money.api_activity_details.total')).toBeOnTheScreen();
      expect(queryByText('$0.00')).not.toBeOnTheScreen();
    });

    it('shows a gray zero amount and a single failed step for failed transfers', () => {
      const failedNeobank: NeobankBankTransferActivity = {
        ...pendingNeobank,
        status: 'Failed',
      };
      mockRouteParams = { neobankActivity: failedNeobank };

      const {
        getAllByTestId,
        getAllByText,
        getByTestId,
        getByText,
        queryAllByTestId,
        queryByText,
      } = render(<MoneyApiActivityDetailsView />);

      expect(getByTestId('header-title')).toHaveTextContent(
        'money.transaction.deposit_failed',
      );
      // Only the header keeps the failed title; the hero label is gone.
      expect(getAllByText('money.transaction.deposit_failed')).toHaveLength(1);
      expect(queryByText('money.transaction.depositing')).not.toBeOnTheScreen();
      expect(getByText('US$0.00')).toBeOnTheScreen();
      expect(getByText('money.transaction.failed')).toBeOnTheScreen();
      expect(getByText('$0.00')).toBeOnTheScreen();
      expect(getAllByTestId('progress-list-item-error')).toHaveLength(1);
      expect(getAllByTestId('progress-list-item-icon')).toHaveLength(1);
      expect(queryAllByTestId('block-explorer-button')).toHaveLength(0);
      expect(
        queryByText('transaction_details.title.musd_conversion'),
      ).not.toBeOnTheScreen();
      expect(
        queryByText('transaction_details.title.money_account_deposit'),
      ).not.toBeOnTheScreen();
    });

    it('marks Bank transfer complete and the remaining steps pending after MoonPay Completed', () => {
      mockLiveNeobankActivity = [{ ...pendingNeobank, status: 'Completed' }];
      mockRouteParams = {
        neobankActivity: pendingNeobank,
      };
      const { getByText, getAllByTestId, queryByText } = render(
        <MoneyApiActivityDetailsView />,
      );

      // Still awaiting on-chain mUSD — overall status stays Pending.
      expect(getByText('money.api_activity_details.pending')).toBeOnTheScreen();
      expect(
        queryByText('money.api_activity_details.you_deposited'),
      ).not.toBeOnTheScreen();
      expect(queryByText(/US\$15\.00/)).not.toBeOnTheScreen();
      expect(getByText('$15.00')).toBeOnTheScreen();
      expect(getAllByTestId('progress-list-item-success')).toHaveLength(1);
      expect(getAllByTestId('progress-list-item-warning')).toHaveLength(2);
    });

    it('opens the provider settlement from any step when a hash exists', () => {
      const withHash: NeobankBankTransferActivity = {
        ...pendingNeobank,
        transactionHash: '0xneo' as Hex,
      };
      mockRouteParams = { neobankActivity: withHash };
      const { getAllByTestId } = render(<MoneyApiActivityDetailsView />);

      const explorerButtons = getAllByTestId('block-explorer-button');
      expect(explorerButtons).toHaveLength(3);

      fireEvent.press(explorerButtons[2]);

      expect(mockGetBlockExplorerTxUrl).toHaveBeenCalledWith(
        expect.anything(),
        withHash.transactionHash,
        'https://monadscan.com',
      );
    });

    it('keeps provider Completed independent from a nearby confirmed activity', () => {
      mockApiActivity = [{ ...bankTransfer, amount: '15000000' }];
      mockLiveNeobankActivity = [{ ...pendingNeobank, status: 'Completed' }];
      mockRouteParams = {
        neobankActivity: pendingNeobank,
      };
      const { getByText, getAllByTestId, queryByText } = render(
        <MoneyApiActivityDetailsView />,
      );

      expect(getByText('money.api_activity_details.pending')).toBeOnTheScreen();
      expect(queryByText(/US\$15\.00/)).not.toBeOnTheScreen();
      expect(getAllByTestId('progress-list-item-success')).toHaveLength(1);
    });
  });

  describe('refund', () => {
    beforeEach(() => {
      mockRouteParams = { activity: refund };
    });

    it('renders the Refund title', () => {
      const { getByTestId } = render(<MoneyApiActivityDetailsView />);
      expect(getByTestId('header-title')).toHaveTextContent(
        'money.transaction.refund',
      );
    });

    it('renders the refunded amount with a plus sign', () => {
      const { getByText } = render(<MoneyApiActivityDetailsView />);
      expect(getByText(/\+1\.50 mUSD/)).toBeTruthy();
    });

    it('renders the "You were refunded" label, not "You earned"', () => {
      const { getByText, queryByText } = render(
        <MoneyApiActivityDetailsView />,
      );
      expect(
        getByText('money.api_activity_details.you_were_refunded'),
      ).toBeTruthy();
      expect(queryByText('money.api_activity_details.you_earned')).toBeNull();
    });

    it('renders the "Received from" row with the sender', () => {
      const { getByText, getByTestId } = render(
        <MoneyApiActivityDetailsView />,
      );
      expect(
        getByText('money.api_activity_details.received_from'),
      ).toBeTruthy();
      expect(getByTestId('counterparty-name')).toHaveTextContent(
        refund.receivedFrom,
      );
    });
  });

  it('renders status as Completed', () => {
    mockRouteParams = { activity: cashback };
    const { getByText } = render(<MoneyApiActivityDetailsView />);
    expect(getByText('money.api_activity_details.completed')).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    mockRouteParams = { activity: cashback };
    const { getByTestId } = render(<MoneyApiActivityDetailsView />);
    fireEvent.press(getByTestId('header-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('pops back and renders nothing when reached without an activity param', () => {
    mockRouteParams = undefined;

    const { toJSON } = render(<MoneyApiActivityDetailsView />);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(toJSON()).toBeNull();
  });
});
