import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { HDAccountDetails } from './HdAccountDetails';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType, BtcAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';

const mockIsEvmAccountType = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const mockEvmAccount = createMockInternalAccount(
  '0x1234567890123456789012345678901234567890',
  'HD EVM Account',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

const mockBtcAccount = createMockInternalAccount(
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  'HD BTC Account',
  KeyringTypes.hd,
  BtcAccountType.P2wpkh,
);

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
};

describe('HDAccountDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders BaseAccountDetails wrapper', () => {
    mockIsEvmAccountType.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <HDAccountDetails account={mockEvmAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
  });

  it('always renders ExportCredentials component', () => {
    mockIsEvmAccountType.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <HDAccountDetails account={mockEvmAccount} />,
      { state: mockInitialState },
    );

    expect(getByTestId('export-credentials')).toBeTruthy();
  });

  it('renders SmartAccountDetails when account is EVM type', () => {
    mockIsEvmAccountType.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <HDAccountDetails account={mockEvmAccount} />,
      { state: mockInitialState },
    );

    expect(getByTestId('smart-account-details')).toBeTruthy();
    expect(getByTestId('export-credentials')).toBeTruthy();
  });

  it('does not render SmartAccountDetails when account is not EVM type', () => {
    mockIsEvmAccountType.mockReturnValue(false);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <HDAccountDetails account={mockBtcAccount} />,
      { state: mockInitialState },
    );

    expect(getByTestId('export-credentials')).toBeTruthy();
    expect(queryByTestId('smart-account-details')).toBeNull();
  });

  it('calls isEvmAccountType with correct account type', () => {
    mockIsEvmAccountType.mockReturnValue(true);

    renderWithProvider(<HDAccountDetails account={mockEvmAccount} />, {
      state: mockInitialState,
    });

    expect(mockIsEvmAccountType).toHaveBeenCalledWith(mockEvmAccount.type);
  });

  it('handles different account types correctly', () => {
    mockIsEvmAccountType.mockReturnValue(true);
    const { getByTestId, queryByTestId, rerender } = renderWithProvider(
      <HDAccountDetails account={mockEvmAccount} />,
      { state: mockInitialState },
    );

    expect(getByTestId('export-credentials')).toBeTruthy();
    expect(getByTestId('smart-account-details')).toBeTruthy();

    mockIsEvmAccountType.mockReturnValue(false);
    rerender(<HDAccountDetails account={mockBtcAccount} />);

    expect(getByTestId('export-credentials')).toBeTruthy();
    expect(queryByTestId('smart-account-details')).toBeNull();
  });

  it('passes correct account to child components', () => {
    mockIsEvmAccountType.mockReturnValue(true);

    const { getByTestId, getByText } = renderWithProvider(
      <HDAccountDetails account={mockEvmAccount} />,
      { state: mockInitialState },
    );

    expect(getByText(mockEvmAccount.metadata.name)).toBeTruthy();
    expect(getByTestId('export-credentials')).toBeTruthy();
    expect(getByTestId('smart-account-details')).toBeTruthy();
  });
});
