import React from 'react';
import AddCustomToken from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('../../../util/networks', () => ({
  getBlockExplorerAddressUrl: jest
    .fn()
    .mockReturnValue({ title: 'test', url: 'test' }),
}));

describe('AddCustomToken', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<AddCustomToken />);
    expect(toJSON()).toMatchSnapshot();
  });
});
