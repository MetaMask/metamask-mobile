import React from 'react';
import Empty from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';


jest.mock('../../../../util/test/utils', () => ({
  isTest: true,
}));

describe('Empty', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<Empty />);
    expect(toJSON()).toMatchSnapshot();
  });
});
