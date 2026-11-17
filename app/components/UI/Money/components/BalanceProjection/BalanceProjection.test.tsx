import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BalanceProjection } from './BalanceProjection';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import { strings } from '../../../../../../locales/i18n';
import {
  COMPONENT_NAMES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
} from '../../constants/moneyEvents';
import Routes from '../../../../../constants/navigation/Routes';

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

describe('BalanceProjection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Est. 1-year balance label and projected balance without an info icon', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId, getByText, queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

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

    const { getByText } = render(
      <BalanceProjection amountFiat="1000" projectedYears={5} />,
    );

    expect(getByText('$1,216.65')).toBeOnTheScreen();
  });

  it('renders the APY pitch with a pressable underline when amountFiat is "0"', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId, getByText, queryByTestId } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );

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

    const { getByTestId, getByText } = render(
      <BalanceProjection amountFiat="" projectedYears={1} />,
    );

    expect(getByTestId('balance-projection-apy-pitch')).toBeOnTheScreen();
    expect(getByText('Earn 4% APY')).toBeOnTheScreen();
  });

  it('tracks the APY tooltip click and opens the APY info sheet when the pitch is pressed', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });
    const { getByTestId } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );

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
    const { getByTestId } = render(
      <BalanceProjection amountFiat="100" projectedYears={1} />,
    );

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
    const { getByTestId } = render(
      <BalanceProjection amountFiat="100.5" projectedYears={1} />,
    );

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

  it('renders no pressables while APY is loading', () => {
    mockBalance({
      apyDecimal: undefined,
      apyPercent: undefined,
      isLoading: true,
    });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection-value-pressable')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch-pressable')).toBeNull();
    expect(queryByTestId('balance-projection-skeleton')).toBeOnTheScreen();
  });

  it('returns null when apyPercent / apyDecimal is unavailable', () => {
    mockBalance({ apyDecimal: undefined, apyPercent: undefined });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null when apyDecimal is negative', () => {
    mockBalance({ apyDecimal: -1, apyPercent: -100 });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null and shows no APY pitch when apyPercent is negative for an empty amount', () => {
    mockBalance({ apyDecimal: -1, apyPercent: -100 });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null for a zero amount when apyPercent is unavailable', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: undefined });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null when apyDecimal is non-finite for a positive amount', () => {
    mockBalance({ apyDecimal: NaN, apyPercent: NaN });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null when apyPercent is non-finite for an empty amount', () => {
    mockBalance({ apyDecimal: NaN, apyPercent: NaN });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('returns null when amountFiat is non-numeric', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="abc" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
  });

  it('renders the projected balance in dollars regardless of the preferred currency', () => {
    mockBalance({ apyDecimal: 0.05, apyPercent: 5 });

    const { getByText, queryByText } = render(
      <BalanceProjection amountFiat="100" projectedYears={1} />,
    );

    expect(getByText('$105.00')).toBeOnTheScreen();
    expect(queryByText(/€/)).toBeNull();
  });
});
