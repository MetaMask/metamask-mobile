import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import { CardTransactionDetails } from './card-transaction-details';
import type { CardTransaction } from '../../../../../UI/Money/types/moneyActivity';

const card: CardTransaction = {
  hash: '0x2b45bda071d8feff265c541e251a5e035e5f55270f8ad288dcd80f6740793847' as Hex,
  time: 1780574031000,
  chainId: '0x8f' as Hex,
  token: {
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex,
    symbol: 'mUSD',
    decimals: 6,
  },
  amount: '5381986',
  to: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e' as Hex,
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: { card?: CardTransaction } | undefined;
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

jest.mock('../../../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: () => ({}),
}));

jest.mock('../../../hooks/useNetworkInfo', () => ({
  __esModule: true,
  default: () => ({ networkName: 'Monad', networkImage: undefined }),
}));

const mockGetBlockExplorerTxUrl = jest.fn(() => ({
  url: 'https://monadscan.com/tx/0x2b45',
  title: 'monadscan.com',
}));
jest.mock('../../../../../../util/networks', () => ({
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

jest.mock('../../token-icon', () => ({
  TokenIcon: () => null,
  TokenIconVariant: { Hero: 'hero' },
}));
jest.mock(
  '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  () => () => null,
);
jest.mock(
  '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork',
  () => () => null,
);
jest.mock(
  '../../../../../../component-library/components/Buttons/Button',
  () => {
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
  },
);

jest.mock('../../../../../../util/intl', () => ({
  getIntlDateTimeFormatter: (_locale: string, _opts?: object) => ({
    format: () => 'Jun',
  }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => key,
}));

describe('CardTransactionDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { card };
  });

  it('renders the header title', () => {
    const { getByTestId } = render(<CardTransactionDetails />);
    expect(getByTestId('header-title')).toHaveTextContent(
      'money.card_details.title',
    );
  });

  it('renders the spent amount formatted to 2 decimals', () => {
    const { getByText } = render(<CardTransactionDetails />);
    expect(getByText(/-5\.38 mUSD/)).toBeTruthy();
  });

  it('renders the "You spent" label', () => {
    const { getByText } = render(<CardTransactionDetails />);
    expect(getByText('money.card_details.you_spent')).toBeTruthy();
  });

  it('renders status as Completed in green', () => {
    const { getByText } = render(<CardTransactionDetails />);
    expect(getByText('money.card_details.completed')).toBeTruthy();
  });

  it('renders the network row', () => {
    const { getByText } = render(<CardTransactionDetails />);
    expect(getByText('Monad')).toBeTruthy();
  });

  it('renders "To" row with "Money account" label', () => {
    const { getByText } = render(<CardTransactionDetails />);
    expect(getByText('transaction_details.label.to')).toBeTruthy();
    expect(getByText('transaction_details.label.money_account')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(<CardTransactionDetails />);
    fireEvent.press(getByTestId('header-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens the block explorer when the button is pressed', () => {
    const { getByTestId } = render(<CardTransactionDetails />);

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

  it('pops back and renders nothing when reached without a card param', () => {
    mockRouteParams = undefined;

    const { toJSON } = render(<CardTransactionDetails />);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(toJSON()).toBeNull();
  });
});
