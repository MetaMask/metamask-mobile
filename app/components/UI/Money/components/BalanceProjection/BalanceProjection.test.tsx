import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import { BalanceProjection } from './BalanceProjection';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useFiatFormatter from '../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { strings } from '../../../../../../locales/i18n';
import {
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
} from '../../constants/moneyEvents';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('../../hooks/useMoneyAccountBalance');
jest.mock('../../../SimulationDetails/FiatDisplay/useFiatFormatter');

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

const useMoneyAccountBalanceMock = jest.mocked(useMoneyAccountBalance);
const useFiatFormatterMock = jest.mocked(useFiatFormatter);

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
  useMoneyAccountBalanceMock.mockReturnValue({
    apyDecimal,
    apyPercent,
    vaultApyQuery: { isLoading },
  } as unknown as ReturnType<typeof useMoneyAccountBalance>);
}

describe('BalanceProjection', () => {
  const formatFiat = jest.fn(
    (value: BigNumber) => `$${value.toFixed(2, BigNumber.ROUND_HALF_UP)}`,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useFiatFormatterMock.mockReturnValue(formatFiat);
  });

  it('renders label and projected balance for $1,000 at apyDecimal 0.04 over 1 year (~$1,040.00)', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId, getByText } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(getByTestId('balance-projection')).toBeOnTheScreen();
    expect(getByText(ONE_YEAR_LABEL, { exact: false })).toBeOnTheScreen();
    expect(getByText('$1040.00')).toBeOnTheScreen();
  });

  it('compounds the projection over multiple years', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByText } = render(
      <BalanceProjection amountFiat="1000" projectedYears={5} />,
    );

    expect(getByText('$1216.65')).toBeOnTheScreen();
  });

  it('renders the APY pitch when amountFiat is "0"', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId, getByText } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );

    expect(getByTestId('balance-projection-apy-pitch')).toBeOnTheScreen();
    expect(getByText('Earn 4% APY')).toBeOnTheScreen();
  });

  it('renders the APY pitch when amountFiat is empty', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId, getByText } = render(
      <BalanceProjection amountFiat="" projectedYears={1} />,
    );

    expect(getByTestId('balance-projection-apy-pitch')).toBeOnTheScreen();
    expect(getByText('Earn 4% APY')).toBeOnTheScreen();
  });

  it('renders the info button on the APY pitch', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );

    expect(
      getByTestId('balance-projection-apy-pitch-info-button'),
    ).toBeOnTheScreen();
  });

  it('tracks the APY tooltip click when the pitch info button is pressed', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });
    const { getByTestId } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );

    fireEvent.press(getByTestId('balance-projection-apy-pitch-info-button'));

    expect(mockTrackTooltipClicked).toHaveBeenCalledTimes(1);
    expect(mockTrackTooltipClicked).toHaveBeenCalledWith({
      tooltip_name: MONEY_TOOLTIP_NAMES.APY,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });
  });

  it('opens the APY info sheet with the current APY when the pitch info button is pressed', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });
    const { getByTestId } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );

    fireEvent.press(getByTestId('balance-projection-apy-pitch-info-button'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: 4, variant: 'deposit' },
    });
  });

  it('renders the info button next to the projected balance', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(getByTestId('balance-projection-info-button')).toBeOnTheScreen();
  });

  it('tracks the earn-on-your-crypto tooltip click when the projection info button is pressed', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });
    const { getByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    fireEvent.press(getByTestId('balance-projection-info-button'));

    expect(mockTrackTooltipClicked).toHaveBeenCalledTimes(1);
    expect(mockTrackTooltipClicked).toHaveBeenCalledWith({
      tooltip_name: MONEY_TOOLTIP_NAMES.EARN_ON_YOUR_CRYPTO,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });
  });

  it('opens the earn crypto info sheet when the projection info button is pressed', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });
    const { getByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    fireEvent.press(getByTestId('balance-projection-info-button'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
      params: { variant: 'deposit' },
    });
  });

  it('renders no info buttons while APY is loading', () => {
    mockBalance({
      apyDecimal: undefined,
      apyPercent: undefined,
      isLoading: true,
    });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection-info-button')).toBeNull();
    expect(
      queryByTestId('balance-projection-apy-pitch-info-button'),
    ).toBeNull();
  });

  it('reserves space with a skeleton while APY is loading', () => {
    mockBalance({
      apyDecimal: undefined,
      apyPercent: undefined,
      isLoading: true,
    });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
    expect(queryByTestId('balance-projection-apy-pitch')).toBeNull();
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

  it('passes a BigNumber to the fiat formatter when projecting', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    render(<BalanceProjection amountFiat="1000" projectedYears={1} />);

    expect(formatFiat).toHaveBeenCalledTimes(1);
    const passed = formatFiat.mock.calls[0][0];
    expect(BigNumber.isBigNumber(passed)).toBe(true);
    expect(passed.toFixed(2)).toBe('1040.00');
  });
});
