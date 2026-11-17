import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyMusdInfoSheet from './MoneyMusdInfoSheet';
import { MoneyMusdInfoSheetTestIds } from './MoneyMusdInfoSheet.testIds';
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

describe('MoneyMusdInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      receiveAmountFiat: '$100',
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

  it('renders dynamic receive title, lead, and all four mUSD bullets', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyMusdInfoSheet />,
    );

    expect(getByTestId(MoneyMusdInfoSheetTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(MoneyMusdInfoSheetTestIds.SCROLL_VIEW),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneyMusdInfoSheetTestIds.TITLE)).toHaveTextContent(
      "You'll receive $100 of MetaMask USD",
    );
    expect(getByTestId(MoneyMusdInfoSheetTestIds.LEAD)).toHaveTextContent(
      strings('money.musd_info_sheet.lead'),
    );
    expect(
      getByText(strings('money.musd_info_sheet.bullet_worth_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.musd_info_sheet.bullet_worth_body')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.musd_info_sheet.bullet_backed_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.musd_info_sheet.bullet_backed_body')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyMusdInfoSheetTestIds.BULLET_EARNS),
    ).toHaveTextContent(
      `Earns up to 6.2% APY${strings('money.musd_info_sheet.bullet_earns_body')}`,
    );
    expect(
      getByText(strings('money.musd_info_sheet.bullet_earns_body')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.musd_info_sheet.bullet_no_lockups_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.musd_info_sheet.bullet_no_lockups_body')),
    ).toBeOnTheScreen();
  });

  it('omits the Earns up to APY bullet when APY is unavailable', () => {
    mockUseParams.mockReturnValue({
      receiveAmountFiat: '$50.25',
    });
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: undefined,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyMusdInfoSheet />,
    );

    expect(getByTestId(MoneyMusdInfoSheetTestIds.TITLE)).toHaveTextContent(
      "You'll receive $50.25 of MetaMask USD",
    );
    expect(queryByTestId(MoneyMusdInfoSheetTestIds.BULLET_EARNS)).toBeNull();
  });

  it('tracks bottom sheet view on mount', () => {
    renderWithProvider(<MoneyMusdInfoSheet />);

    expect(useMoneyAnalytics).toHaveBeenCalledWith({
      bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MUSD_INFO_SHEET,
    });
    expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
  });
});
