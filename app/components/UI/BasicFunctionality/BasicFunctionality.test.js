// Third party dependencies.
import React from 'react';

// Internal dependencies.
import BasicFunctionality from './BasicFunctionality';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('BasicFunctionality', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<BasicFunctionality />);
    expect(toJSON()).toMatchSnapshot();
  });
});
