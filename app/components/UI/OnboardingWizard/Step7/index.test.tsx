import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Step7 from '.';

describe('Step7', () => {
  it('should render correctly', () => {
    const container = renderWithProvider(<Step7 />);
    expect(container).toMatchSnapshot();
  });
});
