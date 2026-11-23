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
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => <View testID={testID}>{children}</View>;

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);

const DEPOSIT_AMOUNT = '$100.00';
const PROJECTED_AMOUNT = '$106.20';
const DEFAULT_APY = 6.2;

describe('MoneyEstimatedBalanceSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      depositAmountFiat: DEPOSIT_AMOUNT,
      projectedAmountFiat: PROJECTED_AMOUNT,
      apy: DEFAULT_APY,
    });
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: 0.062,
      apyPercent: DEFAULT_APY,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyVaultApy>);
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
    });
  });

  it('renders the projected balance title with both amounts', () => {
    const { getByTestId } = renderWithProvider(<MoneyEstimatedBalanceSheet />);

    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.TITLE),
    ).toHaveTextContent(
      strings('money.estimated_balance_sheet.title', {
        depositAmount: DEPOSIT_AMOUNT,
        projectedAmount: PROJECTED_AMOUNT,
      }),
    );
  });

  it('renders the subtitle with the route APY in the sheet APY fragment', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEstimatedBalanceSheet />,
    );

    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.SUBTITLE),
    ).toHaveTextContent(
      `${strings('money.estimated_balance_sheet.subtitle_prefix')}${strings(
        'money.estimated_balance_sheet.subtitle_apy',
        {
          percentage: DEFAULT_APY,
        },
      )}${strings('money.estimated_balance_sheet.subtitle_suffix')}`,
    );
    expect(
      getByText(
        strings('money.estimated_balance_sheet.subtitle_apy', {
          percentage: DEFAULT_APY,
        }),
      ),
    ).toBeOnTheScreen();
    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: false });
  });

  it('renders both benefit bullets', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEstimatedBalanceSheet />,
    );

    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.BULLET_COMPOUND),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.estimated_balance_sheet.bullet_compound_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.estimated_balance_sheet.bullet_compound_body')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.BULLET_NO_LOCKUPS),
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
  });

  it('renders the disclaimer with the route APY', () => {
    const { getByTestId } = renderWithProvider(<MoneyEstimatedBalanceSheet />);

    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.DISCLAIMER),
    ).toHaveTextContent(
      strings('money.estimated_balance_sheet.disclaimer', {
        percentage: DEFAULT_APY,
      }),
    );
  });

  it('falls back to the live APY when the route omits it', () => {
    mockUseParams.mockReturnValue({
      depositAmountFiat: DEPOSIT_AMOUNT,
      projectedAmountFiat: PROJECTED_AMOUNT,
    });
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: 0.045,
      apyPercent: 4.5,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { getByTestId } = renderWithProvider(<MoneyEstimatedBalanceSheet />);

    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: true });
    expect(
      getByTestId(MoneyEstimatedBalanceSheetTestIds.SUBTITLE),
    ).toHaveTextContent(
      `${strings('money.estimated_balance_sheet.subtitle_prefix')}${strings(
        'money.estimated_balance_sheet.subtitle_apy',
        {
          percentage: 4.5,
        },
      )}${strings('money.estimated_balance_sheet.subtitle_suffix')}`,
    );
  });

  it('renders the no-APY subtitle and hides the disclaimer when APY is unavailable', () => {
    mockUseParams.mockReturnValue({
      depositAmountFiat: DEPOSIT_AMOUNT,
      projectedAmountFiat: PROJECTED_AMOUNT,
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

  it('tracks the sheet view with MONEY_ESTIMATED_BALANCE_SHEET', () => {
    renderWithProvider(<MoneyEstimatedBalanceSheet />);

    expect(useMoneyAnalytics).toHaveBeenCalledWith({
      bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_ESTIMATED_BALANCE_SHEET,
    });
    expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
  });
});
