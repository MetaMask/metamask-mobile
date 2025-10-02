import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { typedSignV1ConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import TypedSignV1 from './typed-sign-v1';

jest.mock('../../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getOrAddQRKeyring: jest.fn(),
    },
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
            },
          },
        },
      },
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
  },
}));

describe('TypedSignV1', () => {
  it('should contained required text', async () => {
    const { getByText, getAllByText } = renderWithProvider(<TypedSignV1 />, {
      state: typedSignV1ConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getByText('Hi, Alice!')).toBeDefined();
  });
});
