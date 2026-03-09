import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CashSection from './CashSection';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../UI/Earn/selectors/featureFlags', () => ({
  selectIsMusdConversionFlowEnabledFlag: jest.fn(() => true),
}));

const mockUseMusdConversionEligibility = jest.fn(() => ({ isEligible: true }));
jest.mock('../../../../UI/Earn/hooks/useMusdConversionEligibility', () => ({
  useMusdConversionEligibility: () => mockUseMusdConversionEligibility(),
}));

const mockUseMusdBalance = jest.fn(() => ({
  hasMusdBalanceOnAnyChain: false,
  tokenBalanceAggregated: '0',
  fiatBalanceAggregatedFormatted: '$0.00',
}));
jest.mock('../../../../UI/Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: () => mockUseMusdBalance(),
}));

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(),
  HomeSectionNames: {
    CASH: 'cash',
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
  },
}));

jest.mock('./MusdAggregatedRow', () => {
  const { Text } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(Text, null, 'MusdAggregatedRow'),
  };
});

jest.mock('./CashGetMusdEmptyState', () => {
  const { Text, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(
        View,
        { testID: 'cash-get-musd-empty-state' },
        ReactActual.createElement(
          Text,
          null,
          'Get 3% annualized bonus on your stablecoins when you convert to mUSD.',
        ),
        ReactActual.createElement(Text, null, 'Get mUSD'),
      ),
  };
});

describe('CashSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .requireMock('../../../../UI/Earn/selectors/featureFlags')
      .selectIsMusdConversionFlowEnabledFlag.mockReturnValue(true);
    mockUseMusdConversionEligibility.mockReturnValue({ isEligible: true });
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: false,
      tokenBalanceAggregated: '0',
      fiatBalanceAggregatedFormatted: '$0.00',
    });
  });

  it('returns null when mUSD conversion is disabled', () => {
    jest
      .requireMock('../../../../UI/Earn/selectors/featureFlags')
      .selectIsMusdConversionFlowEnabledFlag.mockReturnValue(false);

    const { queryByText } = renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(queryByText('mUSD')).toBeNull();
  });

  it('returns null when geo is ineligible', () => {
    mockUseMusdConversionEligibility.mockReturnValue({ isEligible: false });

    const { queryByText } = renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(queryByText('mUSD')).toBeNull();
  });

  it('renders mUSD title when enabled', () => {
    renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('mUSD')).toBeOnTheScreen();
  });

  it('navigates to CASH_TOKENS_FULL_VIEW when section header is pressed', () => {
    renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByText('mUSD'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WALLET.CASH_TOKENS_FULL_VIEW,
    );
  });

  it('shows annualized copy', () => {
    renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(
      screen.getByText(
        'Get 3% annualized bonus on your stablecoins when you convert to mUSD.',
      ),
    ).toBeOnTheScreen();
  });

  it('shows Get mUSD empty state when user has no mUSD balance', () => {
    renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('cash-get-musd-empty-state')).toBeOnTheScreen();
    expect(screen.getByText('Get mUSD')).toBeOnTheScreen();
  });

  it('renders MusdAggregatedRow when user has mUSD balance', () => {
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: true,
      tokenBalanceAggregated: '1800',
      fiatBalanceAggregatedFormatted: '$1,800.00',
    });

    renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('MusdAggregatedRow')).toBeOnTheScreen();
  });
});
