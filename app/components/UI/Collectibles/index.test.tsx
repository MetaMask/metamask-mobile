import React from 'react';
import Collectibles from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('Collectibles', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<Collectibles />);
    expect(toJSON()).toMatchSnapshot();
  });
});
