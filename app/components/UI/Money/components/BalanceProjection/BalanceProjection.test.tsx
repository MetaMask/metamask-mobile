import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import I18n, { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  COMPONENT_NAMES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
} from '../../constants/moneyEvents';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import { BalanceProjection } from './BalanceProjection';

jest.mock('../../hooks/useMoneyVaultApy');

const mockTrackTooltipClicked = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackTooltipClicked: mockTrackTooltipClicked,
  })),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const useMoneyVaultApyMock = jest.mocked(useMoneyVaultApy);

const ONE_YEAR_LABEL = strings('confirm.custom_amount.projected_balance', {
  projectedYears: 1,
});

function mockBalance({
  apyDecimal,
  apyPercent,
  isLoading = false,
}: {
  apyDecimal: number | undefined;
  apyPercent: number | undefined;
  isLoading?: boolean;
}) {
  useMoneyVaultApyMock.mockReturnValue({
    apyDecimal,
    apyPercent,
    vaultApyQuery: { isLoading },
  } as unknown as ReturnType<typeof useMoneyVaultApy>);
}

function renderProjection(
  props: { amountFiat: string; projectedYears: number },
  currentCurrency: 'usd' | 'eur' = 'usd',
) {
  return renderWithProvider(<BalanceProjection {...props} />, {
    state: {
      engine: {
        backgroundState: {
          AssetsController: {
            selectedCurrency: currentCurrency,
          },
        },
      },
    },
  });
}

describe('BalanceProjection', () => {
  const originalLocale = I18n.locale;

  beforeEach(() => {
    jest.clearAllMocks();
    I18n.locale = 'en-US';
  });

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it('renders Est. 1-year balance label and projected balance without an info icon', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId, getByText, queryByTestId } = renderProjection({
      amountFiat: '1000',
      projectedYears: 1,
    });

    expect(ONE_YEAR_LABEL).toBe('Est. 1-year balance:');
    expect(getByTestId('balance-projection')).toBeOnTheScreen();
    expect(
      getByText('Est. 1-year balance: ', { exact: true }),
    ).toBeOnTheScreen();
    expect(getByText('$1,040.00')).toBeOnTheScreen();
    expect(queryByTestId('balance-projection-info-button')).toBeNull();
  });

  it('compounds the projection over multiple years', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByText } = renderProjection({
      amountFiat: '1000',
      projectedYears: 5,
    });

    expect(getByText('$1,216.65')).toBeOnTheScreen();
  });

  it('renders the APY pitch with a pressable underline when amountFiat is "0"', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId, getByText, queryByTestId } = renderProjection({
      amountFiat: '0',
      projectedYears: 1,
    });

    expect(getByTestId('balance-projection-apy-pitch')).toBeOnTheScreen();
    expect(
      getByTestId('balance-projection-apy-pitch-pressable'),
    ).toBeOnTheScreen();
    expect(getByText('Earn 4% APY')).toBeOnTheScreen();
    expect(
      queryByTestId('balance-projection-apy-pitch-info-button'),
    ).toBeNull();
  });

  it('renders the APY pitch when amountFiat is empty', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId, getByText } = renderProjection({
      amountFiat: '',
      projectedYears: 1,
    });

    expect(getByTestId('balance-projection-apy-pitch')).toBeOnTheScreen();
    expect(getByText('Earn 4% APY')).toBeOnTheScreen();
  });

  it('tracks the APY tooltip click and opens the APY info sheet when the pitch is pressed', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });
    const { getByTestId } = renderProjection({
      amountFiat: '0',
      projectedYears: 1,
    });

    fireEvent.press(getByTestId('balance-projection-apy-pitch-pressable'));

    expect(mockTrackTooltipClicked).toHaveBeenCalledTimes(1);
    expect(mockTrackTooltipClicked).toHaveBeenCalledWith({
      tooltip_name: MONEY_TOOLTIP_NAMES.APY,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: 4, variant: 'deposit' },
    });
  });

  it('tracks the estimated balance tooltip click and opens MoneyEstimatedBalanceSheet when the projected value is pressed', () => {
    mockBalance({ apyDecimal: 0.062, apyPercent: 6.2 });
    const { getByTestId } = renderProjection({
      amountFiat: '100',
      projectedYears: 1,
    });

    fireEvent.press(getByTestId('balance-projection-value-pressable'));

    expect(mockTrackTooltipClicked).toHaveBeenCalledTimes(1);
    expect(mockTrackTooltipClicked).toHaveBeenCalledWith({
      tooltip_name: MONEY_TOOLTIP_NAMES.ESTIMATED_BALANCE,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
      component_name: COMPONENT_NAMES.MONEY_BALANCE_PROJECTION,
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ESTIMATED_BALANCE_SHEET,
      params: {
        depositAmountFiat: '$100',
        projectedAmountFiat: '$106.20',
        apy: 6.2,
      },
    });
  });

  it('formats decimal deposit amounts with cents when opening MoneyEstimatedBalanceSheet', () => {
    mockBalance({ apyDecimal: 0.05, apyPercent: 5 });
    const { getByTestId } = renderProjection({
      amountFiat: '100.5',
      projectedYears: 1,
    });

    fireEvent.press(getByTestId('balance-projection-value-pressable'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ESTIMATED_BALANCE_SHEET,
      params: {
        depositAmountFiat: '$100.50',
        projectedAmountFiat: '$105.53',
        apy: 5,
      },
    });
  });

  it('formats projection and sheet amounts consistently on comma-decimal locales with "$" only', () => {
    I18n.locale = 'pt-BR';
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId } = renderProjection({
      amountFiat: '1000',
      projectedYears: 1,
    });

    const valueNode = getByTestId('balance-projection-value-pressable');
    expect(valueNode).toHaveTextContent(/1\.040,00/u);
    expect(valueNode).toHaveTextContent(/\$/u);
    expect(valueNode).not.toHaveTextContent('US$');

    fireEvent.press(valueNode);

    const navParams = mockNavigate.mock.calls[0][1].params;
    expect(navParams.depositAmountFiat).not.toContain('US$');
    expect(navParams.projectedAmountFiat).not.toContain('US$');
    expect(navParams.depositAmountFiat).toContain('1.000');
    expect(navParams.projectedAmountFiat).toContain('1.040,00');
  });

  it('renders no pressables while APY is loading', () => {
    mockBalance({
      apyDecimal: undefined,
      apyPercent: undefined,
      isLoading: true,
    });

    const { queryByTestId } = renderProjection({
      amountFiat: '1000',
      projectedYears: 1,
    });

    expect(queryByTestId('balance-projection-value-pressable')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch-pressable')).toBeNull();
    expect(queryByTestId('balance-projection-skeleton')).toBeOnTheScreen();
  });

  it('returns null when apyPercent / apyDecimal is unavailable', () => {
    mockBalance({ apyDecimal: undefined, apyPercent: undefined });

    const { queryByTestId } = renderProjection({
      amountFiat: '1000',
      projectedYears: 1,
    });

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null when apyDecimal is negative', () => {
    mockBalance({ apyDecimal: -1, apyPercent: -100 });

    const { queryByTestId } = renderProjection({
      amountFiat: '1000',
      projectedYears: 1,
    });

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null and shows no APY pitch when apyPercent is negative for an empty amount', () => {
    mockBalance({ apyDecimal: -1, apyPercent: -100 });

    const { queryByTestId } = renderProjection({
      amountFiat: '0',
      projectedYears: 1,
    });

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null for a zero amount when apyPercent is unavailable', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: undefined });

    const { queryByTestId } = renderProjection({
      amountFiat: '0',
      projectedYears: 1,
    });

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null when apyDecimal is non-finite for a positive amount', () => {
    mockBalance({ apyDecimal: NaN, apyPercent: NaN });

    const { queryByTestId } = renderProjection({
      amountFiat: '1000',
      projectedYears: 1,
    });

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null when apyPercent is non-finite for an empty amount', () => {
    mockBalance({ apyDecimal: NaN, apyPercent: NaN });

    const { queryByTestId } = renderProjection({
      amountFiat: '0',
      projectedYears: 1,
    });

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null when amountFiat is non-numeric', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { queryByTestId } = renderProjection({
      amountFiat: 'abc',
      projectedYears: 1,
    });

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('renders the projected balance in dollars regardless of the preferred currency', () => {
    mockBalance({ apyDecimal: 0.05, apyPercent: 5 });

    const { getByText, queryByText } = renderProjection(
      { amountFiat: '100', projectedYears: 1 },
      'eur',
    );

    expect(getByText('$105.00')).toBeOnTheScreen();
    expect(queryByText(/€/)).toBeNull();
  });
});
