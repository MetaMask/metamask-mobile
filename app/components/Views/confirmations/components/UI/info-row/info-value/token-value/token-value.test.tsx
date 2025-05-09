import BigNumber from 'bignumber.js';
import React from 'react';
import { render } from '@testing-library/react-native';

import TokenValue from './token-value';

describe('TokenValue', () => {
  it('should render value correctly', () => {
    const { getByText } = render(
      <TokenValue label={'Value'} value={1000000000000000000} decimals={18} />,
    );
    expect(getByText('1')).toBeDefined();
  });

  it('should render BigNumber value correctly', () => {
    const { getByText } = render(
      <TokenValue
        label={'Value'}
        value={new BigNumber('1000000000000000000')}
        decimals={18}
      />,
    );
    expect(getByText('1')).toBeDefined();
  });

  it('should handle small decimal values', () => {
    const { getByText } = render(
      <TokenValue label={'Value'} value="1000" decimals={6} />,
    );
    expect(getByText('0.001')).toBeDefined();
  });

  it('should handle large numbers', () => {
    const { getByText } = render(
      <TokenValue
        label={'Value'}
        value="123456789000000000000000000"
        decimals={18}
      />,
    );
    expect(getByText('123,456,789')).toBeDefined();
  });

  it('should handle zero value', () => {
    const { getByText } = render(
      <TokenValue label={'Value'} value="0" decimals={18} />,
    );
    expect(getByText('0')).toBeDefined();
  });

  it('should handle very long value with undefined decimals', () => {
    const { getByText } = render(
      <TokenValue label={'Value'} value="1000000000000000000" />,
    );
    expect(getByText('1,000,000,000,0...')).toBeDefined();
  });

  it('should handle very small numbers', () => {
    const { getByText } = render(
      <TokenValue label={'Value'} value="100" decimals={18} />,
    );
    expect(getByText('< 0.000001')).toBeDefined();
  });
});
