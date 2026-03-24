import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyHomeView from './MoneyHomeView';
import { MoneyHomeViewTestIds } from './MoneyHomeView.testIds';
import { MoneyHeaderTestIds } from '../../components/MoneyHeader/MoneyHeader.testIds';
import { MoneyBalanceSummaryTestIds } from '../../components/MoneyBalanceSummary/MoneyBalanceSummary.testIds';
import { MoneyActionButtonRowTestIds } from '../../components/MoneyActionButtonRow/MoneyActionButtonRow.testIds';
import { MoneyYourPositionTestIds } from '../../components/MoneyYourPosition/MoneyYourPosition.testIds';
import { MoneyHowItWorksTestIds } from '../../components/MoneyHowItWorks/MoneyHowItWorks.testIds';
import { MoneyPotentialEarningsTestIds } from '../../components/MoneyPotentialEarnings/MoneyPotentialEarnings.testIds';
import { MoneyMetaMaskCardTestIds } from '../../components/MoneyMetaMaskCard/MoneyMetaMaskCard.testIds';
import { MoneyWhyMetaMaskMoneyTestIds } from '../../components/MoneyWhyMetaMaskMoney/MoneyWhyMetaMaskMoney.testIds';
import { MoneyFooterTestIds } from '../../components/MoneyFooter/MoneyFooter.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    const { View } = jest.requireActual('react-native');
    return <View {...props}>{children}</View>;
  },
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

const mockConversionTokens = [
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: '0x1',
    decimals: 6,
    balanceInSelectedCurrency: '$5,000.00',
  },
];

jest.mock('../../../Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => ({ tokens: mockConversionTokens }),
}));

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
jest.mock('../../../../UI/AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => null),
}));

describe('MoneyHomeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders the your position section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyYourPositionTestIds.CONTAINER)).toBeOnTheScreen();
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
});
