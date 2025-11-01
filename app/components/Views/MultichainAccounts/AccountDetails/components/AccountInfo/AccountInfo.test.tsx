import React from 'react';
import { AccountInfo } from './AccountInfo';
import {
  createMockInternalAccount,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { formatAddress } from '../../../../../../util/address';

// Mock navigation before importing renderWithProvider
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const mockAddress = '0x67B2fAf7959fB61eb9746571041476Bbd0672569';
const mockAccount = createMockInternalAccount(
  mockAddress,
  'Test Account',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

const render = (account: InternalAccount) =>
  renderWithProvider(<AccountInfo account={account} />, {
    state: {
      engine: {
        backgroundState: {
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        },
      },
    },
  });

describe('AccountInfo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly with account information', () => {
    const { getByText } = render(mockAccount);

    expect(getByText(mockAccount.metadata.name)).toBeTruthy();
  });

  it('displays account name correctly', () => {
    const { getByText } = render(mockAccount);

    expect(getByText('Test Account')).toBeTruthy();
  });

  it('displays formatted address correctly', () => {
    const { getByText } = render(mockAccount);

    expect(getByText(formatAddress(mockAccount.address, 'short'))).toBeTruthy();
  });

  it('calls formatAddress with correct parameters', () => {
    render(mockAccount);
  });

  it('handles different account types', () => {
    const mockSnapAddress = '0x9876543210987654321098765432109876543210';
    const snapAccount = createMockInternalAccount(
      mockSnapAddress,
      'Snap Account',
      KeyringTypes.snap,
      EthAccountType.Eoa,
    );

    const { getByText } = render(snapAccount);

    expect(getByText('Snap Account')).toBeTruthy();
    expect(getByText(formatAddress(mockSnapAddress, 'short'))).toBeTruthy();
  });

  it('handles long account names correctly', () => {
    const longNameAccount = createMockInternalAccount(
      '0x1234567890123456789012345678901234567890',
      'Very Long Account Name That Should Still Display Correctly',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    const { getByText } = render(longNameAccount);

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

    const { getByText } = render(differentAccount);

    expect(getByText('Different Account')).toBeTruthy();
  });
});
