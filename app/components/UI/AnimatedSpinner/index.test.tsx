import React from 'react';
import AnimatedSpinner from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('AnimatedSpinner', () => {
  it('should render correctly', () => {
    const component = renderWithProvider(<AnimatedSpinner />);
    expect(component).toMatchSnapshot();
  });
});
