import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfo from './account-network-info-row';

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
                address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
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
            },
          ],
          keyringsMetadata: [
            {
              id: '01JNG71B7GTWH0J1TSJY9891S0',
              name: '',
            },
          ],
        },
      },
    },
  };
});

describe('AccountNetworkInfo', () => {
  it('should render correctly', async () => {
    const { getByText } = renderWithProvider(<AccountNetworkInfo />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('0x935E7...05477')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});
