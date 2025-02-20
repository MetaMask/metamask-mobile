import React from 'react';
import Root from './';
import { render, waitFor } from '@testing-library/react-native';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';

jest.mock('../../../core/SecureKeychain', () => ({
  init: jest.fn(),
}));

jest.mock('../../../core/EntryScriptWeb3', () => ({
  init: jest.fn(),
}));

describe('Root', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<Root foxCode="" />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should initialize SecureKeychain', async () => {
    render(<Root foxCode="" />);
    await waitFor(() => {
      expect(SecureKeychain.init).toHaveBeenCalled();
    });
  });

  it('should initialize EntryScriptWeb3', async () => {
    render(<Root foxCode="" />);
    expect(EntryScriptWeb3.init).toHaveBeenCalled();
  });
});
