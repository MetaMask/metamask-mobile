import React from 'react';
import AnimatedSpinner from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('AnimatedSpinner', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<AnimatedSpinner />);
    expect(toJSON()).toMatchSnapshot();
  });
});
