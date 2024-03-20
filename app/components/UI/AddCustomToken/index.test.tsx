import React from 'react';
import AddCustomToken from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('AddCustomToken', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<AddCustomToken />);
    expect(toJSON()).toMatchSnapshot();
  });
});
