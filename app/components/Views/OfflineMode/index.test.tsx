import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import OfflineMode from './';

describe('OfflineMode', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<OfflineMode />);
    getByText("You're offline");
  });
});
