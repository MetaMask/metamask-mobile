import React from 'react';
import FoxScreen from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('FoxScreen', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<FoxScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
