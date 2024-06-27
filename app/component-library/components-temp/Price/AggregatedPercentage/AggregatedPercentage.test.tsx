import React from 'react';
import { render } from '@testing-library/react-native';
import AggregatedPercentage from './AggregatedPercentage';
import { mockTheme } from '../../../../util/theme';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
describe('AggregatedPercentage', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) return 'USD';
    });
  });
  afterEach(() => {
    (useSelector as jest.Mock).mockClear();
  });
  it('should render correctly', () => {
    const { toJSON } = render(
      <AggregatedPercentage
        ethFiat={100}
        tokenFiat={100}
        tokenFiat1dAgo={90}
        ethFiat1dAgo={90}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders positive percentage change correctly', () => {
    const { getByText } = render(
      <AggregatedPercentage
        ethFiat={200}
        tokenFiat={300}
        tokenFiat1dAgo={250}
        ethFiat1dAgo={150}
      />,
    );

    expect(getByText('(+25.00%)')).toBeTruthy();
    expect(getByText('+100 USD')).toBeTruthy();

    expect(getByText('(+25.00%)').props.style).toMatchObject({
      color: mockTheme.colors.success.default,
      textTransform: 'uppercase',
    });
  });

  it('renders negative percentage change correctly', () => {
    const { getByText } = render(
      <AggregatedPercentage
        ethFiat={150}
        tokenFiat={200}
        tokenFiat1dAgo={300}
        ethFiat1dAgo={200}
      />,
    );

    expect(getByText('(-30.00%)')).toBeTruthy();
    expect(getByText('-150 USD')).toBeTruthy();

    expect(getByText('(-30.00%)').props.style).toMatchObject({
      color: mockTheme.colors.error.default,
      textTransform: 'uppercase',
    });
  });
});
