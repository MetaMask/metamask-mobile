import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import UnstakingTime from './UnstakingTime';

describe('UnstakingTime', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<UnstakingTime />);

    expect(getByText('Withdrawal time')).toBeDefined();
    expect(getByText('1 to 11 days')).toBeDefined();
  });
});