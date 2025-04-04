import React from 'react';
import AddCustomToken from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('../../../util/networks', () => ({
  getBlockExplorerAddressUrl: jest
    .fn()
    .mockReturnValue({ title: 'test', url: 'https://example.com/' }),
}));

describe('AddCustomToken', () => {
  it('render matches previous snapshot', () => {
    const { toJSON } = renderWithProvider(<AddCustomToken />);
    expect(toJSON()).toMatchSnapshot();
  });
});
