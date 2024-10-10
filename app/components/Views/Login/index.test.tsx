import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('Login', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
        <Login />
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
