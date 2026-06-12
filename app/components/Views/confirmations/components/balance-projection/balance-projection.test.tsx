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
  apyPercent = apyDecimal === undefined ? undefined : apyDecimal * 100,
  isLoading = false,
}: {
  apyDecimal: number | undefined;
  apyPercent?: number;
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
    mockBalance({ apyDecimal: 0.04 });

    const { getByTestId, getByText } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(getByTestId('balance-projection')).toBeOnTheScreen();
    expect(getByText(ONE_YEAR_LABEL, { exact: false })).toBeOnTheScreen();
    expect(getByText('$1040.00')).toBeOnTheScreen();
  });

  it('compounds the projection over multiple years', () => {
    mockBalance({ apyDecimal: 0.04 });

    const { getByText } = render(
      <BalanceProjection amountFiat="1000" projectedYears={5} />,
    );

    expect(getByText('$1216.65')).toBeOnTheScreen();
  });

  it('returns null while APY is loading', () => {
    mockBalance({ apyDecimal: undefined, isLoading: true });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );

    expect(queryByTestId('balance-projection')).toBeNull();
  });

  it('returns null when apyDecimal is unavailable or negative', () => {
    mockBalance({ apyDecimal: undefined });
    const { queryByTestId: queryUndefined } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );
    expect(queryUndefined('balance-projection')).toBeNull();

    mockBalance({ apyDecimal: -1 });
    const { queryByTestId: queryNegative } = render(
      <BalanceProjection amountFiat="1000" projectedYears={1} />,
    );
    expect(queryNegative('balance-projection')).toBeNull();
  });

  it('shows the "earn up to APY" prompt for empty or zero amounts', () => {
    mockBalance({ apyDecimal: 0.04, apyPercent: 4 });
    const earnLabel = strings('confirm.custom_amount.earn_up_to_apy', {
      percentage: 4,
    });

    const { getByText: getByTextEmpty } = render(
      <BalanceProjection amountFiat="" projectedYears={1} />,
    );
    expect(getByTextEmpty(earnLabel)).toBeOnTheScreen();

    const { getByText: getByTextZero } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );
    expect(getByTextZero(earnLabel)).toBeOnTheScreen();
  });

  it('returns null for a zero amount when apyPercent is unavailable', () => {
    useMoneyAccountBalanceMock.mockReturnValue({
      apyDecimal: 0.04,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyAccountBalance>);

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="0" projectedYears={1} />,
    );
    expect(queryByTestId('balance-projection')).toBeNull();
  });

  it('returns null for non-numeric amountFiat', () => {
    mockBalance({ apyDecimal: 0.04 });

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="abc" projectedYears={1} />,
    );
    expect(queryByTestId('balance-projection')).toBeNull();
  });
});
