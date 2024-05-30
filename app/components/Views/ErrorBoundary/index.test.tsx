import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ErrorBoundary from './';

describe('ErrorBoundary', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<ErrorBoundary />, {});
    expect(toJSON()).toMatchSnapshot();
  });
});
