import React from 'react';
import WebviewProgressBar from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('WebviewProgressBar', () => {
  it('should render correctly', () => {
    const component = renderWithProvider(<WebviewProgressBar />);
    expect(component).toMatchSnapshot();
  });
});
