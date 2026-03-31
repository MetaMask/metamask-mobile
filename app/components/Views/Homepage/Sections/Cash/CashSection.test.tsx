import React, { createRef } from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CashSection from './CashSection';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';

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

jest.mock('../../../../UI/Money/selectors/featureFlags', () => ({
  selectMoneyHomeScreenEnabledFlag: jest.fn(() => false),
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
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: {
    CASH: 'cash',
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
  },
}));

let musdAggregatedRowRenderCount = 0;
jest.mock('./MusdAggregatedRow', () => {
  const { Text } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: () => {
      musdAggregatedRowRenderCount += 1;
      return ReactActual.createElement(Text, null, 'MusdAggregatedRow');
    },
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
    jest
      .requireMock('../../../../UI/Money/selectors/featureFlags')
      .selectMoneyHomeScreenEnabledFlag.mockReturnValue(false);
    mockUseMusdConversionEligibility.mockReturnValue({ isEligible: true });
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: false,
      tokenBalanceAggregated: '0',
      fiatBalanceAggregatedFormatted: '$0.00',
    });
    musdAggregatedRowRenderCount = 0;
  });

  it('returns null when mUSD conversion is disabled', () => {
    jest
      .requireMock('../../../../UI/Earn/selectors/featureFlags')
      .selectIsMusdConversionFlowEnabledFlag.mockReturnValue(false);

    const { queryByText } = renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(queryByText('Cash')).toBeNull();
  });

  it('returns null when geo is ineligible', () => {
    mockUseMusdConversionEligibility.mockReturnValue({ isEligible: false });

    const { queryByText } = renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(queryByText('Cash')).toBeNull();
  });

  it('renders Cash title when enabled', () => {
    renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Cash')).toBeOnTheScreen();
  });

  it('navigates to CASH_TOKENS_FULL_VIEW when Money home screen flag is disabled', () => {
    jest
      .requireMock('../../../../UI/Money/selectors/featureFlags')
      .selectMoneyHomeScreenEnabledFlag.mockReturnValue(false);

    renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByText('Cash'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WALLET.CASH_TOKENS_FULL_VIEW,
    );
  });

  it('navigates to Money home screen when Money home screen flag is enabled', () => {
    jest
      .requireMock('../../../../UI/Money/selectors/featureFlags')
      .selectMoneyHomeScreenEnabledFlag.mockReturnValue(true);

    renderWithProvider(
      <CashSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByText('Cash'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ROOT);
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

  it('remounts row when refresh is called via section ref', async () => {
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: true,
      tokenBalanceAggregated: '1800',
      fiatBalanceAggregatedFormatted: '$1,800.00',
    });
    const ref = createRef<SectionRefreshHandle>();

    renderWithProvider(
      <CashSection ref={ref} sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(musdAggregatedRowRenderCount).toBe(1);

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(musdAggregatedRowRenderCount).toBe(2);
  });
});
