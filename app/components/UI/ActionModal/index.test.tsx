import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ActionModal from './';

describe('ActionModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<ActionModal />);
    expect(toJSON()).toMatchSnapshot();
  });
});
