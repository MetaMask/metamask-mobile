import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import useEarnAssetCatalogue from '../../hooks/useEarnAssetCatalogue';
import useMoneyAccountBalance from '../../../Money/hooks/useMoneyAccountBalance';
import { useProjectedEarnings } from '../../../Money/hooks/useProjectedEarnings';
import EarnSectionListView from './EarnSectionListView';

const mockGoBack = jest.fn();
const mockUseSelector = jest.mocked(useSelector);
const mockUseEarnAssetCatalogue = jest.mocked(useEarnAssetCatalogue);
const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockInitiateDeposit = jest.fn();
const mockUseProjectedEarnings = jest.mocked(useProjectedEarnings);
const mockNavigateToEarnOpportunity = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })),
}));

jest.mock('../../hooks/useEarnAssetCatalogue', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../Money/hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(() => ({
    initiateDeposit: mockInitiateDeposit,
  })),
}));

jest.mock('../../../Money/hooks/useProjectedEarnings', () => ({
  useProjectedEarnings: jest.fn(),
}));

jest.mock('../../hooks/useEarnOpportunityNavigation', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    navigateToEarnOpportunity: mockNavigateToEarnOpportunity,
  })),
}));

jest.mock('../../../Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: jest.fn(() => ({
    navigateToMoneyHome: jest.fn(),
  })),
}));

// TODO: Purpose of this mock if we're not returning anything? Wouldn't we want the EarnMoneyAccountRow to be rendered?
jest.mock(
  '../../../../Views/TrendingView/feeds/earn/EarnMoneyAccountRow',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

// TODO: Purpose of this mock if we're not returning anything? Wouldn't we want the EarnSearchAssetRow to be rendered?
jest.mock(
  '../../../../Views/TrendingView/feeds/earn/EarnSearchAssetRow',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

// TODO: Purpose of this mock if we're not returning anything? Wouldn't we want the PotentialEarningsTokenRow to be rendered?
jest.mock(
  '../../../Money/components/MoneyPotentialEarnings/PotentialEarningsTokenRow',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

jest.mock('@shopify/flash-list', () => ({
  FlashList: (props: {
    data: readonly unknown[];
    ListEmptyComponent?: React.ReactNode;
    ListHeaderComponent?: React.ReactNode;
    testID?: string;
  }) => {
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    const { View: MockView } =
      jest.requireActual<typeof import('react-native')>('react-native');

    return ReactActual.createElement(
      MockView,
      { testID: props.testID },
      props.ListHeaderComponent,
      props.data.length === 0 ? props.ListEmptyComponent : null,
    );
  },
}));

describe('EarnSectionListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigation).mockReturnValue({
      goBack: mockGoBack,
      navigate: jest.fn(),
    } as ReturnType<typeof useNavigation>);
    mockUseSelector.mockReturnValue(true);
    mockUseEarnAssetCatalogue.mockReturnValue({
      assets: [],
      hasError: false,
      isLoading: false,
      moneyApyPercent: undefined,
      moneyRateStatus: 'unavailable',
      refresh: jest.fn().mockResolvedValue(undefined),
      assetsById: {},
      errors: [],
    });
    // TODO: Fix type errors
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatRaw: '0',
      totalFiatFormatted: '$0.00',
      isBalanceLoading: false,
      refetchBalance: jest.fn().mockResolvedValue(undefined),
    });
    mockUseProjectedEarnings.mockReturnValue({
      totalAssetsFiat: 0,
      projectedAmount: 0,
      currency: 'USD',
    });
  });

  it('renders fallback description when projection data is unavailable', () => {
    render(<EarnSectionListView />);

    expect(
      screen.getByText(strings('earn_module.money_fallback_description')),
    ).toBeOnTheScreen();
  });

  it('does not render fallback description while loading', () => {
    mockUseEarnAssetCatalogue.mockReturnValue({
      assets: [],
      hasError: false,
      isLoading: true,
      moneyApyPercent: undefined,
      moneyRateStatus: 'loading',
      refresh: jest.fn().mockResolvedValue(undefined),
      assetsById: {},
      errors: [],
    });

    render(<EarnSectionListView />);

    expect(
      screen.queryByText(strings('earn_module.money_fallback_description')),
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId('earn-section-list-loading')).toBeOnTheScreen();
  });

  it('uses existing back handler from replacement header', () => {
    render(<EarnSectionListView />);

    fireEvent.press(screen.getByTestId('earn-section-list-header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
