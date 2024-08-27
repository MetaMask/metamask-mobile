import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import OfflineMode from './';

describe('OfflineMode', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<OfflineMode />);
    expect(toJSON()).toMatchSnapshot();
  });
});
