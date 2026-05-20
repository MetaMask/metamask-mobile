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

  it('treats empty or non-numeric amountFiat as zero or null', () => {
    mockBalance({ apyDecimal: 0.04 });

    const { getByText } = render(
      <BalanceProjection amountFiat="" projectedYears={1} />,
    );
    expect(getByText('$0.00')).toBeOnTheScreen();

    const { queryByTestId } = render(
      <BalanceProjection amountFiat="abc" projectedYears={1} />,
    );
    expect(queryByTestId('balance-projection')).toBeNull();
  });
});
