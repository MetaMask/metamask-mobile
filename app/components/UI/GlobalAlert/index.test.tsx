import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import GlobalAlert from './';

describe('GlobalAlert', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<GlobalAlert />);
    expect(toJSON()).toMatchSnapshot();
  });
});
