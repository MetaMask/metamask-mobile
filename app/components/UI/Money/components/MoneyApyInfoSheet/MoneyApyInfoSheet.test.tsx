import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyApyInfoSheet from './MoneyApyInfoSheet';
import { MoneyApyInfoSheetTestIds } from './MoneyApyInfoSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
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

const DEFAULT_APY = 6.2;

describe('MoneyApyInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ apy: DEFAULT_APY });
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: 0.062,
      apyPercent: DEFAULT_APY,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyVaultApy>);
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
    });
  });

  it('renders the container and scroll view', () => {
    const { getByTestId } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(getByTestId(MoneyApyInfoSheetTestIds.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(MoneyApyInfoSheetTestIds.SCROLL_VIEW)).toBeOnTheScreen();
  });

  it('renders the APY headline, subtitle, and lead', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyApyInfoSheet />,
    );

    expect(getByTestId(MoneyApyInfoSheetTestIds.APY_TITLE)).toHaveTextContent(
      '6.2% APY',
    );
    expect(getByText(strings('money.apy_tooltip.subtitle'))).toBeOnTheScreen();
    expect(getByText(strings('money.apy_tooltip.lead'))).toBeOnTheScreen();
    expect(
      getByText(
        strings('money.apy_tooltip.paragraph_1', { percentage: DEFAULT_APY }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the sectioned APY copy', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(strings('money.apy_tooltip.how_it_works_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.apy_tooltip.how_it_works_body')),
    ).toBeOnTheScreen();
    expect(getByText('Why it changes')).toBeOnTheScreen();
    expect(
      getByText(strings('money.apy_tooltip.why_it_changes_body')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.apy_tooltip.where_it_comes_from_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.apy_tooltip.where_it_comes_from_body')),
    ).toBeOnTheScreen();
  });

  it('renders paragraph_3 and paragraph_4 below the sections', () => {
    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(strings('money.apy_tooltip.paragraph_3')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.apy_tooltip.paragraph_4')),
    ).toBeOnTheScreen();
  });

  it('renders the premium lead when vaultStatus is premium', () => {
    mockUseParams.mockReturnValue({
      apy: DEFAULT_APY,
      vaultStatus: 'premium',
    });

    const { getByText, queryByText } = renderWithProvider(
      <MoneyApyInfoSheet />,
    );

    expect(
      getByText(
        strings('money.apy_tooltip.paragraph_1_premium', {
          percentage: DEFAULT_APY,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByText(
        strings('money.apy_tooltip.paragraph_1', { percentage: DEFAULT_APY }),
      ),
    ).toBeNull();
  });

  it('renders the upgrading migration line with the standard lead', () => {
    mockUseParams.mockReturnValue({
      apy: DEFAULT_APY,
      vaultStatus: 'upgrading',
    });

    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(strings('money.apy_tooltip.migration_upgrading')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('money.apy_tooltip.paragraph_1', { percentage: DEFAULT_APY }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the downgrading migration line', () => {
    mockUseParams.mockReturnValue({
      apy: DEFAULT_APY,
      vaultStatus: 'downgrading',
    });

    const { getByText } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(
      getByText(strings('money.apy_tooltip.migration_downgrading')),
    ).toBeOnTheScreen();
  });

  it('falls back to the live APY when the route omits it', () => {
    mockUseParams.mockReturnValue({});
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: 0.045,
      apyPercent: 4.5,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { getByTestId } = renderWithProvider(<MoneyApyInfoSheet />);

    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: true });
    expect(getByTestId(MoneyApyInfoSheetTestIds.APY_TITLE)).toHaveTextContent(
      '4.5% APY',
    );
  });

  it('omits the APY headline when APY is unavailable', () => {
    mockUseParams.mockReturnValue({});
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: undefined,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { queryByTestId, getByText } = renderWithProvider(
      <MoneyApyInfoSheet />,
    );

    expect(queryByTestId(MoneyApyInfoSheetTestIds.APY_TITLE)).toBeNull();
    expect(getByText(strings('money.apy_tooltip.subtitle'))).toBeOnTheScreen();
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_APY_INFO_SHEET bottom_sheet_name', () => {
      renderWithProvider(<MoneyApyInfoSheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_APY_INFO_SHEET,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyApyInfoSheet />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });
  });
});
