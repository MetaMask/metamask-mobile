import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyHomeView from './MoneyHomeView';
import { MoneyHomeViewTestIds } from './MoneyHomeView.testIds';
import { MoneyHeaderTestIds } from '../../components/MoneyHeader/MoneyHeader.testIds';
import { MoneyBalanceSummaryTestIds } from '../../components/MoneyBalanceSummary/MoneyBalanceSummary.testIds';
import { MoneyActionButtonRowTestIds } from '../../components/MoneyActionButtonRow/MoneyActionButtonRow.testIds';
import { MoneyEarningsTestIds } from '../../components/MoneyEarnings/MoneyEarnings.testIds';
import { MoneyOnboardingCardTestIds } from '../../components/MoneyOnboardingCard/MoneyOnboardingCard.testIds';
import { MoneyHowItWorksTestIds } from '../../components/MoneyHowItWorks/MoneyHowItWorks.testIds';
import { MoneyPotentialEarningsTestIds } from '../../components/MoneyPotentialEarnings/MoneyPotentialEarnings.testIds';
import { MoneyMetaMaskCardTestIds } from '../../components/MoneyMetaMaskCard/MoneyMetaMaskCard.testIds';
import { MoneyWhyMetaMaskMoneyTestIds } from '../../components/MoneyWhyMetaMaskMoney/MoneyWhyMetaMaskMoney.testIds';
import { MoneyFooterTestIds } from '../../components/MoneyFooter/MoneyFooter.testIds';
import { MoneyActivityListTestIds } from '../../components/MoneyActivityList/MoneyActivityList.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import MOCK_MONEY_TRANSACTIONS from '../../constants/mockActivityData';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

const mockConversionTokens = [
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: '0x1',
    decimals: 6,
    balanceInSelectedCurrency: '$5,000.00',
    fiat: { balance: 5000 },
  },
];

jest.mock('../../../Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => ({ tokens: mockConversionTokens }),
}));

jest.mock('../../hooks/useMoneyAccountTransactions', () => ({
  useMoneyAccountTransactions: jest.fn(),
}));

const mockUseMoneyAccountTransactions = jest.mocked(
  useMoneyAccountTransactions,
);

jest.mock(
  '../../../../UI/Assets/components/AssetLogo/AssetLogo',
  () => 'AssetLogo',
);
jest.mock(
  '../../../../../component-library/components/Badges/BadgeWrapper',
  () => ({
    __esModule: true,
    default: 'BadgeWrapper',
    BadgePosition: { BottomRight: 'BottomRight' },
  }),
);
jest.mock('../../../../../component-library/components/Badges/Badge', () => ({
  __esModule: true,
  default: 'Badge',
  BadgeVariant: { Network: 'Network' },
}));

jest.mock('../../components/MoneyActivityItem/MoneyActivityItem', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ tx }: { tx: { id: string } }) => (
      <View testID={`money-activity-item-${tx.id}`}>
        <Text>{tx.id}</Text>
      </View>
    ),
  };
});
jest.mock('../../../../UI/AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => null),
}));

describe('MoneyHomeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Activity list renders when there are at least 10 transactions; pad the
    // mock set so the activity-related assertions below find the View all button.
    const paddedTransactions = Array.from({ length: 10 }, (_, index) => ({
      ...MOCK_MONEY_TRANSACTIONS[index % MOCK_MONEY_TRANSACTIONS.length],
      id: `padded-${index}`,
    }));
    mockUseMoneyAccountTransactions.mockReturnValue({
      allTransactions: paddedTransactions,
      deposits: [],
      transfers: [],
      submittedTransactions: [],
      moneyAddress: '0x0000000000000000000000000000000000000001',
    });
  });

  it('renders the main container', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyHomeViewTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the scroll view', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW)).toBeOnTheScreen();
  });

  it('renders the header section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyHeaderTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the balance summary section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyBalanceSummaryTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the action button row', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(
      getByTestId(MoneyActionButtonRowTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the onboarding card', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyOnboardingCardTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the earnings section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyEarningsTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the how it works section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyHowItWorksTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the potential earnings section when tokens exist', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(
      getByTestId(MoneyPotentialEarningsTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the MetaMask Card section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyMetaMaskCardTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the why MetaMask Money section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(
      getByTestId(MoneyWhyMetaMaskMoneyTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the footer', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyFooterTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('pressing the back button calls navigation.goBack', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyHeaderTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to the Money activity screen when View all is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ACTIVITY);
  });
});
