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

const ONE_YEAR_LABEL = strings(
  'confirm.custom_amount.projected_one_year_balance',
  { projectedYears: 1 },
);

function mockBalance({
  apyDecimal,
  isLoading = false,
}: {
  apyDecimal: number | undefined;
  isLoading?: boolean;
}) {
  useMoneyAccountBalanceMock.mockReturnValue({
    apyDecimal,
    vaultApyQuery: {
      isLoading,
    },
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
    mockBalance({ apyDecimal: 0.04 });

    const { getByTestId, getByText } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(getByTestId('balance-projection')).toBeOnTheScreen();
    expect(getByText(ONE_YEAR_LABEL, { exact: false })).toBeOnTheScreen();
    // 1000 * (1 + 0.04)^1 = 1040
    expect(getByText('$1040.00')).toBeOnTheScreen();
  });

  it('renders $1,021.80 for $1,000 at apyDecimal 0.0218 over 1 year', () => {
    mockBalance({ apyDecimal: 0.0218 });

    const { getByText } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    // 1000 * (1 + 0.0218)^1 = 1021.8
    expect(getByText('$1021.80')).toBeOnTheScreen();
  });

  it('compounds the projection over multiple years', () => {
    mockBalance({ apyDecimal: 0.04 });

    const { getByText } = render(
      <BalanceProjection amountFiat="1000" projectedYears={5} />,
    );

    // 1000 * (1.04)^5 ≈ 1216.6529...
    expect(getByText('$1216.65')).toBeOnTheScreen();
  });

  it('interpolates projectedYears into the label string', () => {
    const expectedLabel = strings(
      'confirm.custom_amount.projected_one_year_balance',
      { projectedYears: 3 },
    );
    expect(expectedLabel).toContain('3');
  });

  it('returns null while APY is loading', () => {
    mockBalance({ apyDecimal: undefined, isLoading: true });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
  });

  it('returns null when apyDecimal is unavailable', () => {
    mockBalance({ apyDecimal: undefined });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
  });

  it('returns null when apyDecimal is negative', () => {
    mockBalance({ apyDecimal: -1 });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
  });

  it('returns null when apyDecimal is not finite', () => {
    mockBalance({ apyDecimal: Number.POSITIVE_INFINITY });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
  });

  it('renders $0.00 when apyDecimal is 0 and amount is 0', () => {
    mockBalance({ apyDecimal: 0 });

    const { getByText } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );

    expect(getByText('$0.00')).toBeOnTheScreen();
  });

  it('renders the amount unchanged when apyDecimal is 0 and amount is positive', () => {
    mockBalance({ apyDecimal: 0 });

    const { getByText } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    // 1000 * (1 + 0)^1 = 1000
    expect(getByText('$1000.00')).toBeOnTheScreen();
  });

  it('treats empty amountFiat as zero', () => {
    mockBalance({ apyDecimal: 0.04 });

    const { getByText } = render(
      <BalanceProjection amountFiat="" projectedYears={1} />,
    );

    expect(getByText('$0.00')).toBeOnTheScreen();
  });

  it('passes a BigNumber to the fiat formatter', () => {
    mockBalance({ apyDecimal: 0.04 });

    render(<BalanceProjection amountFiat="1000" projectedYears={1} />);

    expect(formatFiat).toHaveBeenCalledTimes(1);
    const passed = formatFiat.mock.calls[0][0];
    expect(BigNumber.isBigNumber(passed)).toBe(true);
    // 1000 * (1 + 0.04)^1 = 1040
    expect(passed.toFixed(4)).toBe('1040.0000');
  });

  it('returns null when amountFiat is non-numeric', () => {
    mockBalance({ apyDecimal: 0.04 });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="abc" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
  });
});
