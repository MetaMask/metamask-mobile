import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import TermsAndConditions from './';

describe('TermsAndConditions', () => {
  it('should render correctly', () => {
    const component = renderWithProvider(
      <TermsAndConditions action="import" />,
    );
    expect(component).toMatchSnapshot();
  });
});
