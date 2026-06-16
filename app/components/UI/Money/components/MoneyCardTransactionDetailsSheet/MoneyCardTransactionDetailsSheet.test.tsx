import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import MoneyCardTransactionDetailsSheet from './MoneyCardTransactionDetailsSheet';
import { MoneyCardTransactionDetailsSheetTestIds } from './MoneyCardTransactionDetailsSheet.testIds';
import type { CardTransaction } from '../../types/moneyActivity';
import { selectMoneyEnableActivityDetailsBlockexplorerLinkFlag } from '../../selectors/featureFlags';

jest.mock('../../selectors/featureFlags', () => ({
  selectMoneyEnableActivityDetailsBlockexplorerLinkFlag: jest.fn(),
}));

const mockedSelectBlockexplorerFlag = jest.mocked(
  selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
);

const card: CardTransaction = {
  hash: '0x2b45bda071d8feff265c541e251a5e035e5f55270f8ad288dcd80f6740793847' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
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
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: () => ({}),
}));
jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'usd',
  selectCurrencyRates: () => ({
    ETH: { conversionRate: 2000, usdConversionRate: 2000 },
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

// Heavy presentational deps reduced to passthroughs / stubs.
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    ...actual,
    BottomSheet: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    BottomSheetHeader: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    Text: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => <RNText testID={testID}>{children}</RNText>,
  };
});

jest.mock('../../../../Views/confirmations/components/token-icon', () => ({
  TokenIcon: () => null,
  TokenIconVariant: { Hero: 'hero' },
}));
jest.mock('../../../Name/Name', () => () => null);
jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork',
  () => () => null,
);
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

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => key,
}));

describe('MoneyCardTransactionDetailsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { card };
    mockedSelectBlockexplorerFlag.mockReturnValue(true);
  });

  it('renders the outgoing card amount', () => {
    const { getByTestId } = render(<MoneyCardTransactionDetailsSheet />);

    expect(
      getByTestId(MoneyCardTransactionDetailsSheetTestIds.AMOUNT),
    ).toHaveTextContent('-5.38 mUSD');
  });

  it('opens the block explorer for the tx hash on press', () => {
    const { getByTestId } = render(<MoneyCardTransactionDetailsSheet />);

    fireEvent.press(
      getByTestId(MoneyCardTransactionDetailsSheetTestIds.EXPLORER_BUTTON),
    );

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

  it('hides the block explorer button when moneyEnableActivityDetailsBlockexplorerLink flag is off', () => {
    mockedSelectBlockexplorerFlag.mockReturnValue(false);

    const { queryByTestId } = render(<MoneyCardTransactionDetailsSheet />);

    expect(
      queryByTestId(MoneyCardTransactionDetailsSheetTestIds.EXPLORER_BUTTON),
    ).toBeNull();
  });

  it('pops back and renders nothing when reached without a card param', () => {
    // Arrange — e.g. navigation-state restoration with no params.
    mockRouteParams = undefined;

    // Act
    const { queryByTestId } = render(<MoneyCardTransactionDetailsSheet />);

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(
      queryByTestId(MoneyCardTransactionDetailsSheetTestIds.CONTAINER),
    ).toBeNull();
  });
});
