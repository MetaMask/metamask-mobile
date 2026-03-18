import React from 'react';
import Empty from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

describe('Empty', () => {
  it('should render correctly', () => {
    const component = renderWithProvider(<Empty />);
    expect(component).toMatchSnapshot();
  });
});
