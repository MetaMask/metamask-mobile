import React from 'react';
import AddCustomToken from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('../../../util/networks', () => ({
  getBlockExplorerAddressUrl: jest
    .fn()
    .mockReturnValue({ title: 'test-network', url: 'https://test-2.com/' }),
}));

describe('AddCustomToken', () => {
  it('render correctly', () => {
    const { toJSON } = renderWithProvider(<AddCustomToken />);
    expect(toJSON()).toMatchSnapshot();
  });
});
