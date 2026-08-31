import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import { MoneyApiActivityDetailsView } from './MoneyApiActivityDetailsView';
import type { AccountsApiActivity } from '../../types/moneyActivity';
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
let mockRouteParams:
  | {
      activity?: AccountsApiActivity;
      enrichment?: CardTransaction;
      cardTransaction?: CardTransaction;
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

describe('MoneyApiActivityDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBlockExplorerFlag = true;
    mockRouteParams = { activity: card };
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
    expect(getByText('money.api_activity_details.completed')).toBeTruthy();
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
