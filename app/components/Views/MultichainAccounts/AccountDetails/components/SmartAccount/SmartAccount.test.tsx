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

jest.mock('../../../../confirmations/hooks/7702/useEIP7702Networks', () => ({
  useEIP7702Networks: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

import { useEIP7702Networks } from '../../../../confirmations/hooks/7702/useEIP7702Networks';
import AppConstants from '../../../../../../core/AppConstants';

const mockUseEIP7702Networks = useEIP7702Networks as jest.MockedFunction<
  typeof useEIP7702Networks
>;

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
    mockUseEIP7702Networks.mockReturnValue({
      network7702List: [],
      networkSupporting7702Present: false,
      pending: false,
    });
  });

  it('displays learn more button correctly', () => {
    const { getByText } = render(mockAccount);

    expect(
      getByText(strings('multichain_accounts.smart_account.learn_more')),
    ).toBeTruthy();
  });

  it('calls navigation when learn more button is pressed', () => {
    const { getByText } = render(mockAccount);

    const learnMoreButton = getByText(
      strings('multichain_accounts.smart_account.learn_more'),
    );
    fireEvent.press(learnMoreButton);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.SMART_ACCOUNTS,
        title: 'Smart Accounts',
      },
    });
  });

  it('returns null for non-EVM account types', () => {
    const nonEvmAccount = {
      ...mockAccount,
      type: SolAccountType.DataAccount,
    };

    const { toJSON } = render(nonEvmAccount);

    expect(toJSON()).toBeNull();
  });
});
