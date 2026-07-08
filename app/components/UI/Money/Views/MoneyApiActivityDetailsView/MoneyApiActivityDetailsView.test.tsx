import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import { MoneyApiActivityDetailsView } from './MoneyApiActivityDetailsView';
import type { AccountsApiActivity } from '../../types/moneyActivity';

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

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: { activity?: AccountsApiActivity } | undefined;
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
  selectMoneyEnableActivityDetailsBlockexplorerLinkFlag: () => true,
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
  const { View, Text: RNText } = jest.requireActual('react-native');
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
jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork',
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
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { Pressable, Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      testID,
    }: {
      label: string;
      onPress: () => void;
      testID?: string;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <RNText>{label}</RNText>
      </Pressable>
    ),
    ButtonVariants: {},
    ButtonSize: {},
    ButtonWidthTypes: {},
  };
});

jest.mock('../../../../../util/intl', () => ({
  getIntlDateTimeFormatter: (_locale: string, _opts?: object) => ({
    format: () => 'Jun',
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => key,
}));

describe('MoneyApiActivityDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { activity: card };
  });

  describe('card spend', () => {
    it('renders the card title', () => {
      const { getByTestId } = render(<MoneyApiActivityDetailsView />);
      expect(getByTestId('header-title')).toHaveTextContent(
        'money.api_activity_details.card_title',
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

    it('renders the "To" row with the "Money account" label', () => {
      const { getByText } = render(<MoneyApiActivityDetailsView />);
      expect(getByText('transaction_details.label.to')).toBeTruthy();
      expect(getByText('transaction_details.label.money_account')).toBeTruthy();
    });
  });

  describe('cashback', () => {
    beforeEach(() => {
      mockRouteParams = { activity: cashback };
    });

    it('renders the cashback title', () => {
      const { getByTestId } = render(<MoneyApiActivityDetailsView />);
      expect(getByTestId('header-title')).toHaveTextContent(
        'money.api_activity_details.cashback_title',
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
  });

  it('renders status as Completed', () => {
    const { getByText } = render(<MoneyApiActivityDetailsView />);
    expect(getByText('money.api_activity_details.completed')).toBeTruthy();
  });

  it('renders the network row', () => {
    const { getByText } = render(<MoneyApiActivityDetailsView />);
    expect(getByText('Monad')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(<MoneyApiActivityDetailsView />);
    fireEvent.press(getByTestId('header-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
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

  it('pops back and renders nothing when reached without an activity param', () => {
    mockRouteParams = undefined;

    const { toJSON } = render(<MoneyApiActivityDetailsView />);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(toJSON()).toBeNull();
  });
});
