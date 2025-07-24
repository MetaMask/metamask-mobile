import BigNumber from 'bignumber.js';
import React from 'react';

import { MOCK_NETWORK_CONTROLLER_STATE } from '../../../../../../../../util/test/confirm-data-helpers';
import { RootState } from '../../../../../../../../reducers';
import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import CurrencyDisplay from './currency-display';

const mockState = {
  engine: {
    backgroundState: {
      NetworkController: MOCK_NETWORK_CONTROLLER_STATE,
    },
  },
} as unknown as RootState;

describe('TokenValue', () => {
  it('should render value correctly', () => {
    const { getByText } = renderWithProvider(
      <CurrencyDisplay value={1000000000000000000} chainId="0xaa36a7" />,
      { state: mockState },
    );
    expect(getByText('1 SepoliaETH')).toBeDefined();
  });

  it('should render BigNumber value correctly', () => {
    const { getByText } = renderWithProvider(
      <CurrencyDisplay
        value={new BigNumber('1000000000000000000')}
        chainId="0xaa36a7"
      />,
      { state: mockState },
    );
    expect(getByText('1 SepoliaETH')).toBeDefined();
  });

  it('should handle small decimal values', () => {
    const { getByText } = renderWithProvider(
      <CurrencyDisplay value="1000" chainId="0xaa36a7" />,
      { state: mockState },
    );
    expect(getByText('< 0.000001 SepoliaETH')).toBeDefined();
  });

  it('should handle large numbers', () => {
    const { getByText } = renderWithProvider(
      <CurrencyDisplay
        value="123456789000000000000000000"
        chainId="0xaa36a7"
      />,
      { state: mockState },
    );
    expect(getByText('123,456,789 SepoliaETH')).toBeDefined();
  });

  it('should handle zero value', () => {
    const { getByText } = renderWithProvider(
      <CurrencyDisplay value="0" chainId="0xaa36a7" />,
      { state: mockState },
    );
    expect(getByText('0 SepoliaETH')).toBeDefined();
  });

  it('should handle very small numbers', () => {
    const { getByText } = renderWithProvider(
      <CurrencyDisplay value="100" chainId="0xaa36a7" />,
      { state: mockState },
    );
    expect(getByText('< 0.000001 SepoliaETH')).toBeDefined();
  });
});
