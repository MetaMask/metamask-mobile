import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyEstimatedBalanceSheet from './MoneyEstimatedBalanceSheet';
import { MoneyEstimatedBalanceSheetTestIds } from './MoneyEstimatedBalanceSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

const mockTrackBottomSheetViewed = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock('../../hooks/useMoneyVaultApy');

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: jest.fn(),
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(View, { testID }, children);
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);

describe('MoneyEstimatedBalanceSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      depositAmountFiat: '$100',
      projectedAmountFiat: '$106.20',
      apy: 6.2,
    });
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: 0.062,
      apyPercent: 6.2,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyVaultApy>);
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
    });
  });

  it('renders dynamic title, subtitle with APY, bullets, and disclaimer inside a ScrollView', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEstimatedBalanceSheet />,
    );

    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.SCROLL_VIEW),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.TITLE),
    ).toHaveTextContent('Your $100 could grow to $106.20');
    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.SUBTITLE),
    ).toHaveTextContent(
      'Estimated balance after one year in your MetaMask Money account at 6.2% APY',
    );
    expect(
      getByText(strings('money.estimated_balance_sheet.bullet_compound_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.estimated_balance_sheet.bullet_compound_body')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('money.estimated_balance_sheet.bullet_no_lockups_title'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('money.estimated_balance_sheet.bullet_no_lockups_body'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.DISCLAIMER),
    ).toHaveTextContent(
      "This estimate assumes 6.2% APY for a full year. APY is variable and isn't guaranteed.",
    );
  });

  it('falls back to subtitle without APY and omits disclaimer when APY is unavailable', () => {
    mockUseParams.mockReturnValue({
      depositAmountFiat: '$250',
      projectedAmountFiat: '$250.00',
    });
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: undefined,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyEstimatedBalanceSheet />,
    );

    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.SUBTITLE),
    ).toHaveTextContent(
      strings('money.estimated_balance_sheet.subtitle_no_apy'),
    );
    expect(
      queryByTestId(MoneyEstimatedBalanceSheetTestIds.DISCLAIMER),
    ).toBeNull();
  });

  it('tracks bottom sheet view on mount', () => {
    renderWithProvider(<MoneyEstimatedBalanceSheet />);

    expect(useMoneyAnalytics).toHaveBeenCalledWith({
      bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_ESTIMATED_BALANCE_SHEET,
    });
    expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
  });
});
