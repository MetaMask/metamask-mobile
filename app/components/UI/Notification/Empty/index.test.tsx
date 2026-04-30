import React from 'react';
import Empty from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

describe('Empty', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<Empty />);
    expect(getByText('Nothing to see here')).toBeOnTheScreen();
  });
});
