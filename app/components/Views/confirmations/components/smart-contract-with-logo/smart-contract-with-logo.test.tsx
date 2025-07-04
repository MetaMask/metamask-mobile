import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SmartContractWithLogo from './smart-contract-with-logo';

describe('SmartContractWithLogo', () => {
  it('renders correctly', () => {
    const { getByText } = renderWithProvider(<SmartContractWithLogo />, {});
    expect(getByText('Smart contract')).toBeTruthy();
  });
});
