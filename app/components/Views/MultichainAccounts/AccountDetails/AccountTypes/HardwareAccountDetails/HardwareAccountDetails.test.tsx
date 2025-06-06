import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { HardwareAccountDetails } from './HardwareAccountDetails';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';

const mockIsRemoteAccountAvailable = jest.fn();

jest.mock('../../../../../../util/address', () => ({
  isRemoteAccountAvailable: () => mockIsRemoteAccountAvailable(),
}));

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
};

const hardwareWalletTypes = [
  {
    type: KeyringTypes.ledger,
    name: 'Ledger Account',
    address: '0x1234567890123456789012345678901234567890',
  },
  {
    type: KeyringTypes.trezor,
    name: 'Trezor Account',
    address: '0x9876543210987654321098765432109876543210',
  },
  {
    type: KeyringTypes.lattice,
    name: 'Lattice Account',
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  },
  {
    type: KeyringTypes.qr,
    name: 'QR Hardware Account',
    address: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba',
  },
];

describe('HardwareAccountDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders BaseAccountDetails wrapper', () => {
    const mockAccount = createMockInternalAccount(
      '0x1234567890123456789012345678901234567890',
      'Hardware Account',
      KeyringTypes.ledger,
      EthAccountType.Eoa,
    );

    mockIsRemoteAccountAvailable.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <HardwareAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
  });

  it('renders RemoveAccount component', () => {
    const mockAccount = createMockInternalAccount(
      '0x1234567890123456789012345678901234567890',
      'Hardware Account',
      KeyringTypes.ledger,
      EthAccountType.Eoa,
    );

    mockIsRemoteAccountAvailable.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <HardwareAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    expect(getByTestId('remove-account')).toBeTruthy();
  });

  it('calls isRemoteAccountAvailable with correct account', () => {
    const mockAccount = createMockInternalAccount(
      '0x1234567890123456789012345678901234567890',
      'Hardware Account',
      KeyringTypes.ledger,
      EthAccountType.Eoa,
    );

    mockIsRemoteAccountAvailable.mockReturnValue(true);

    renderWithProvider(<HardwareAccountDetails account={mockAccount} />, {
      state: mockInitialState,
    });

    expect(mockIsRemoteAccountAvailable).toHaveBeenCalledWith(mockAccount);
  });

  it('renders components regardless of remote account availability', () => {
    const mockAccount = createMockInternalAccount(
      '0x1234567890123456789012345678901234567890',
      'Hardware Account',
      KeyringTypes.ledger,
      EthAccountType.Eoa,
    );

    mockIsRemoteAccountAvailable.mockReturnValue(true);
    const { getByTestId, rerender } = renderWithProvider(
      <HardwareAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
    expect(getByTestId('remove-account')).toBeTruthy();

    mockIsRemoteAccountAvailable.mockReturnValue(false);
    rerender(<HardwareAccountDetails account={mockAccount} />);

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
    expect(getByTestId('remove-account')).toBeTruthy();
  });

  it.each(hardwareWalletTypes)(
    'handles $name correctly',
    ({ type, name, address }) => {
      const hardwareAccount = createMockInternalAccount(
        address,
        name,
        type,
        EthAccountType.Eoa,
      );

      mockIsRemoteAccountAvailable.mockReturnValue(false);

      const { getByTestId, getByText } = renderWithProvider(
        <HardwareAccountDetails account={hardwareAccount} />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
      ).toBeTruthy();
      expect(getByText(name)).toBeTruthy();
      expect(getByTestId('remove-account')).toBeTruthy();
      expect(mockIsRemoteAccountAvailable).toHaveBeenCalledWith(
        hardwareAccount,
      );
    },
  );

  it.each(hardwareWalletTypes)(
    'calls isRemoteAccountAvailable for $name',
    ({ type, name, address }) => {
      const hardwareAccount = createMockInternalAccount(
        address,
        name,
        type,
        EthAccountType.Eoa,
      );

      mockIsRemoteAccountAvailable.mockReturnValue(true);

      renderWithProvider(<HardwareAccountDetails account={hardwareAccount} />, {
        state: mockInitialState,
      });

      expect(mockIsRemoteAccountAvailable).toHaveBeenCalledWith(
        hardwareAccount,
      );
    },
  );
});
