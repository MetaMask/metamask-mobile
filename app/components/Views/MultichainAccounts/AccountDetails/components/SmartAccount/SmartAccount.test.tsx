import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { SmartAccountDetails } from './SmartAccount';
import {
  createMockInternalAccount,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { strings } from '../../../../../../../locales/i18n';
import Icon from '../../../../../../component-library/components/Icons/Icon';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockAddress = '0x67B2fAf7959fB61eb9746571041476Bbd0672569';
const mockAccount = createMockInternalAccount(
  mockAddress,
  'Test Smart Account',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

const render = (account: InternalAccount) =>
  renderWithProvider(<SmartAccountDetails account={account} />, {
    state: {
      engine: {
        backgroundState: {
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        },
      },
    },
  });

describe('SmartAccountDetails', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('displays smart account row with correct text', () => {
    const { getByText } = render(mockAccount);

    expect(
      getByText(strings('multichain_accounts.account_details.smart_account')),
    ).toBeTruthy();
  });

  it('displays arrow icon', () => {
    const { UNSAFE_getByType } = render(mockAccount);

    // Check that an Icon element is rendered
    const iconElement = UNSAFE_getByType(Icon);
    expect(iconElement).toBeTruthy();
  });

  it('navigates to SmartAccountDetails when pressed', () => {
    const { getByText } = render(mockAccount);

    const smartAccountRow = getByText(
      strings('multichain_accounts.account_details.smart_account'),
    );
    fireEvent.press(smartAccountRow);

    expect(mockNavigate).toHaveBeenCalledWith('SmartAccountDetails', {
      account: mockAccount,
    });
  });

  it('renders as TouchableOpacity for interaction', () => {
    const { getByText } = render(mockAccount);

    const smartAccountRow = getByText(
      strings('multichain_accounts.account_details.smart_account'),
    );

    // Should be pressable
    expect(smartAccountRow).toBeTruthy();
    fireEvent.press(smartAccountRow);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('returns null for non-EVM account types', () => {
    const nonEvmAccount = {
      ...mockAccount,
      type: SolAccountType.DataAccount,
    };

    const { toJSON } = render(nonEvmAccount);

    expect(toJSON()).toBeNull();
  });

  it('renders correctly for EVM account types', () => {
    const { toJSON } = render(mockAccount);

    expect(toJSON()).not.toBeNull();
  });
});
