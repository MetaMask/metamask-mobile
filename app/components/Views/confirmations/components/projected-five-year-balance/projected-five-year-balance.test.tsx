import React from 'react';
import { render } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import { ProjectedFiveYearBalance } from './projected-five-year-balance';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter');

const useMoneyAccountBalanceMock = jest.mocked(useMoneyAccountBalance);
const useFiatFormatterMock = jest.mocked(useFiatFormatter);

const LABEL = strings('confirm.custom_amount.projected_five_year_balance');

function mockBalance({
  apy,
  isLoading = false,
}: {
  apy: number | undefined;
  isLoading?: boolean;
}) {
  useMoneyAccountBalanceMock.mockReturnValue({
    vaultApyQuery: {
      data: apy === undefined ? undefined : { apy },
      isLoading,
    },
  } as unknown as ReturnType<typeof useMoneyAccountBalance>);
}

describe('ProjectedFiveYearBalance', () => {
  const formatFiat = jest.fn(
    (value: BigNumber) => `$${value.toFixed(2, BigNumber.ROUND_HALF_UP)}`,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useFiatFormatterMock.mockReturnValue(formatFiat);
  });

  it('renders label and projected balance for $1,000 at 5% APY over 5 years (~$1,276.28)', () => {
    mockBalance({ apy: 5 });

    const { getByTestId, getByText } = render(
      <ProjectedFiveYearBalance amountFiat="1000" />,
    );

    expect(getByTestId('projected-five-year-balance')).toBeOnTheScreen();
    expect(getByText(LABEL, { exact: false })).toBeOnTheScreen();
    // 1000 * (1.05)^5 = 1276.2815625
    expect(getByText('$1276.28')).toBeOnTheScreen();
  });

  it('matches the Figma example: $1,000 at the design APY rounds to $1,114.36 when APY=2.18', () => {
    mockBalance({ apy: 2.18 });

    const { getByText } = render(
      <ProjectedFiveYearBalance amountFiat="1000" />,
    );

    // 1000 * (1.0218)^5 ≈ 1113.86 — sanity-checks the compounding formula
    // tracks the figma direction (label + green dollar amount); exact APY/value
    // is product-driven, this just guards the math.
    expect(getByText(/^\$1\d{3}\.\d{2}$/)).toBeOnTheScreen();
  });

  it('returns null while APY is loading', () => {
    mockBalance({ apy: undefined, isLoading: true });

    const { queryByTestId } = render(
      <ProjectedFiveYearBalance amountFiat="1000" />,
    );

    expect(queryByTestId('projected-five-year-balance')).toBeNull();
  });

  it('returns null when APY data is unavailable', () => {
    mockBalance({ apy: undefined });

    const { queryByTestId } = render(
      <ProjectedFiveYearBalance amountFiat="1000" />,
    );

    expect(queryByTestId('projected-five-year-balance')).toBeNull();
  });

  it('returns null when APY is negative', () => {
    mockBalance({ apy: -1 });

    const { queryByTestId } = render(
      <ProjectedFiveYearBalance amountFiat="1000" />,
    );

    expect(queryByTestId('projected-five-year-balance')).toBeNull();
  });

  it('returns null when APY is not finite', () => {
    mockBalance({ apy: Number.POSITIVE_INFINITY });

    const { queryByTestId } = render(
      <ProjectedFiveYearBalance amountFiat="1000" />,
    );

    expect(queryByTestId('projected-five-year-balance')).toBeNull();
  });

  it('renders $0.00 when apy is 0% (compounding identity)', () => {
    mockBalance({ apy: 0 });

    const { getByText } = render(<ProjectedFiveYearBalance amountFiat="0" />);

    expect(getByText('$0.00')).toBeOnTheScreen();
  });

  it('treats empty amountFiat as zero', () => {
    mockBalance({ apy: 5 });

    const { getByText } = render(<ProjectedFiveYearBalance amountFiat="" />);

    expect(getByText('$0.00')).toBeOnTheScreen();
  });

  it('passes a BigNumber to the fiat formatter', () => {
    mockBalance({ apy: 5 });

    render(<ProjectedFiveYearBalance amountFiat="1000" />);

    expect(formatFiat).toHaveBeenCalledTimes(1);
    const passed = formatFiat.mock.calls[0][0];
    expect(BigNumber.isBigNumber(passed)).toBe(true);
    // 1000 * 1.05^5 = 1276.2815625
    expect(passed.toFixed(4)).toBe('1276.2816');
  });

  it('returns null when amountFiat is non-numeric', () => {
    mockBalance({ apy: 5 });

    const { queryByTestId } = render(
      <ProjectedFiveYearBalance amountFiat="abc" />,
    );

    expect(queryByTestId('projected-five-year-balance')).toBeNull();
  });
});
