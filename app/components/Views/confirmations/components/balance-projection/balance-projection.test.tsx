import React from 'react';
import { render } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import { BalanceProjection } from './balance-projection';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter');

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
    expect(getByText('Earn up to 4% APY')).toBeOnTheScreen();
  });

  it('renders the APY pitch when amountFiat is empty', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });

    const { getByTestId, getByText } = render(
      <BalanceProjection amountFiat="" projectedYears={1} />,
    );

    expect(getByTestId('balance-projection-apy-pitch')).toBeOnTheScreen();
    expect(getByText('Earn up to 4% APY')).toBeOnTheScreen();
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
