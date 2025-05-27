import React from 'react';
import { render } from '@testing-library/react-native';
import { AccountInfo } from './index';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';

const mockFormatAddress = jest.fn();
jest.mock('../../../../../../util/address', () => ({
  formatAddress: mockFormatAddress,
}));

const mockAccount = createMockInternalAccount(
  '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
  'Test Account',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

describe('AccountInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatAddress.mockImplementation((address, format) => {
      if (format === 'short') {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
      }
      return address;
    });
  });

  it('renders correctly with account information', () => {
    const { getByText } = render(<AccountInfo account={mockAccount} />);

    expect(getByText(mockAccount.metadata.name)).toBeTruthy();
  });

  it('displays account name correctly', () => {
    const { getByText } = render(<AccountInfo account={mockAccount} />);

    expect(getByText('Test Account')).toBeTruthy();
  });

  it('displays formatted address correctly', () => {
    const { getByText } = render(<AccountInfo account={mockAccount} />);

    expect(mockFormatAddress).toHaveBeenCalledWith(
      mockAccount.address,
      'short',
    );
    expect(getByText('0x67B2...2569')).toBeTruthy();
  });

  it('calls formatAddress with correct parameters', () => {
    render(<AccountInfo account={mockAccount} />);

    expect(mockFormatAddress).toHaveBeenCalledWith(
      '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
      'short',
    );
  });

  it('handles different account types', () => {
    const snapAccount = createMockInternalAccount(
      '0x9876543210987654321098765432109876543210',
      'Snap Account',
      KeyringTypes.snap,
      EthAccountType.Eoa,
    );

    const { getByText } = render(<AccountInfo account={snapAccount} />);

    expect(getByText('Snap Account')).toBeTruthy();
    expect(getByText('0x9876...3210')).toBeTruthy();
  });

  it('handles long account names correctly', () => {
    const longNameAccount = createMockInternalAccount(
      '0x1234567890123456789012345678901234567890',
      'Very Long Account Name That Should Still Display Correctly',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    const { getByText } = render(<AccountInfo account={longNameAccount} />);

    expect(
      getByText('Very Long Account Name That Should Still Display Correctly'),
    ).toBeTruthy();
  });

  it('renders with different account addresses correctly', () => {
    const differentAccount = createMockInternalAccount(
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      'Different Account',
      KeyringTypes.simple,
      EthAccountType.Eoa,
    );

    const { getByText } = render(<AccountInfo account={differentAccount} />);

    expect(getByText('Different Account')).toBeTruthy();
    expect(mockFormatAddress).toHaveBeenCalledWith(
      differentAccount.address,
      'short',
    );
  });
});
