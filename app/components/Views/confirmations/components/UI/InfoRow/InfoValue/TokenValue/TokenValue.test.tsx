import BigNumber from 'bignumber.js';
import React from 'react';
import { render } from '@testing-library/react-native';

import TokenValue from './TokenValue';

describe('TokenValue', () => {
  it('should render string value correctly', () => {
    const { getByText } = render(
      <TokenValue value="1000000000000000000" decimals={18} />,
    );
    expect(getByText('1')).toBeDefined();
  });

  it('should render number value correctly', () => {
    const { getByText } = render(
      <TokenValue value={1000000000000000000} decimals={18} />,
    );
    expect(getByText('1')).toBeDefined();
  });

  it('should render BigNumber value correctly', () => {
    const { getByText } = render(
      <TokenValue value={new BigNumber('1000000000000000000')} decimals={18} />,
    );
    expect(getByText('1')).toBeDefined();
  });

  it('should handle small decimal values', () => {
    const { getByText } = render(<TokenValue value="1000" decimals={6} />);
    expect(getByText('0.001')).toBeDefined();
  });

  it('should handle large numbers', () => {
    const { getByText } = render(
      <TokenValue value="123456789000000000000000000" decimals={18} />,
    );
    expect(getByText('123,456,789')).toBeDefined();
  });

  it('should handle zero value', () => {
    const { getByText } = render(<TokenValue value="0" decimals={18} />);
    expect(getByText('0')).toBeDefined();
  });

  it('should handle undefined decimals', () => {
    const { getByText } = render(<TokenValue value="1000000000000000000" />);
    expect(getByText('1,000,000,000,000,000,000')).toBeDefined();
  });

  it('should truncate long numbers according to specified limits', () => {
    const { getByText } = render(
      <TokenValue value="123456789.123456789123456789" decimals={18} />,
    );
    // Should truncate to 15 characters from start based on shortenString config
    expect(getByText('123,456,789.123')).toBeDefined();
  });

  it('should handle very small numbers without showing scientific notation', () => {
    const { getByText } = render(<TokenValue value="100" decimals={18} />);
    expect(getByText('0.0000000000000001')).toBeDefined();
  });
});
