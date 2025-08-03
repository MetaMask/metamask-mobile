import React from 'react';
import { render } from '@testing-library/react-native';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import { TotalRow } from './total-row';

jest.mock('../../../hooks/pay/useTransactionTotalFiat');

const TOTAL_FIAT_MOCK = '$123.456';

describe('TotalRow', () => {
  const useTransactionTotalFiatMock = jest.mocked(useTransactionTotalFiat);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionTotalFiatMock.mockReturnValue({
      value: 123.456,
      formatted: TOTAL_FIAT_MOCK,
    });
  });

  it('renders the total amount', () => {
    const { getByText } = render(<TotalRow />);
    expect(getByText(TOTAL_FIAT_MOCK)).toBeDefined();
  });
});
