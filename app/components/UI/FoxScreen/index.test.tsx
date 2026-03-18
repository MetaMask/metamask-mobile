import React from 'react';
import FoxScreen from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('FoxScreen', () => {
  it('should render correctly', () => {
    const component = renderWithProvider(<FoxScreen />);
    expect(component).toMatchSnapshot();
  });
});
