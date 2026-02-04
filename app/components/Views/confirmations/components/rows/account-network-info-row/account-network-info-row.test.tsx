import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfo from './account-network-info-row';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';

jest.mock('../../../../../../core/Engine', () => {
  const { KeyringTypes } = jest.requireActual('@metamask/keyring-controller');
  return {
    getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
    context: {
      AccountsController: {
        state: {
          internalAccounts: {
            accounts: {
              '1': {
                id: '1',
                address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
                metadata: {
                  name: 'Account 1',
                  keyring: {
                    type: 'HD Key Tree',
                  },
                },
                options: {
                  entropySource: '01JNG71B7GTWH0J1TSJY9891S0',
                },
              },
            },
          },
        },
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              type: KeyringTypes.hd,
              accounts: ['0x935e73edb9ff52e23bac7f7e043a1ecd06d05477'],
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
        },
      },
    },
  };
});

jest.mock(
  '../../../../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: () => false,
  }),
);

describe('AccountNetworkInfo', () => {
  it('should render correctly', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountNetworkInfo />,
      {
        state: personalSignatureConfirmationState,
      },
    );
    // Verify the account address is displayed (abbreviated format)
    expect(getByText('0x935E7...05477')).toBeDefined();
    // Verify the expandable component is rendered with the correct testID
    expect(
      getByTestId(ConfirmationRowComponentIDs.ACCOUNT_NETWORK),
    ).toBeDefined();
  });
});
