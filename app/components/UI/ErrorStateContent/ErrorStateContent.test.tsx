import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ErrorStateContent from './ErrorStateContent';

describe('ErrorStateContent', () => {
  it('renders the failure illustration, title, and description', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <ErrorStateContent
        title="Something went wrong"
        description="Try again."
        illustrationTestID="error-illustration"
      />,
    );

    expect(getByTestId('error-illustration')).toBeOnTheScreen();
    expect(getByText('Something went wrong')).toBeOnTheScreen();
    expect(getByText('Try again.')).toBeOnTheScreen();
  });
});
