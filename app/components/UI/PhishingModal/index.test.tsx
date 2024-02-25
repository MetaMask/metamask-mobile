import React from 'react';
import PhishingModal from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('PhishingModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<PhishingModal />);
    expect(toJSON()).toMatchSnapshot();
  });
});
