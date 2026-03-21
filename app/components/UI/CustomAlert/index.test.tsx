import React from 'react';
import CustomAlert from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('CustomAlert', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<CustomAlert isVisible />);
    expect(toJSON()).toMatchSnapshot();
  });
});
