import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import TermsAndConditions from './';

describe('TermsAndConditions', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(<TermsAndConditions action="import" />);
    expect(wrapper).toMatchSnapshot();
  });
});
