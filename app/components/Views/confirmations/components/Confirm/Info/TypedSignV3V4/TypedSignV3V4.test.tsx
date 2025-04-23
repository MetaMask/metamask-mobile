import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  typedSignV3ConfirmationState,
  typedSignV4ConfirmationState,
} from '../../../../../../../util/test/confirm-data-helpers';
import TypedSignV3V4 from './TypedSignV3V4';

jest.mock('../../../../../../../core/Engine', () => ({
  resetState: jest.fn(),
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getOrAddQRKeyring: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: () => 123,
    },
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
  },
  controllerMessenger: {
    subscribe: jest.fn(),
  },
}));

jest.mock('../../../../hooks/useTokenDecimalsInTypedSignRequest', () => ({
  useTokenDecimalsInTypedSignRequest: () => 2,
}));

describe('TypedSignV3V4', () => {
  it('contains required text', () => {
    const { getByText } = renderWithProvider(<TypedSignV3V4 />, {
      state: typedSignV3ConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Primary type')).toBeDefined();
    expect(getByText('Mail')).toBeDefined();
  });

  it('does not display first row (Primary Type) if simulation section is displayed', async () => {
    const { getByText, queryByText } = renderWithProvider(<TypedSignV3V4 />, {
      state: typedSignV4ConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(queryByText('Primary type')).toBeNull();
    expect(queryByText('Mail')).toBeNull();
  });

  it('shows detailed message when message section is clicked', () => {
    const { getByText, getAllByText } = renderWithProvider(<TypedSignV3V4 />, {
      state: typedSignV4ConfirmationState,
    });
    fireEvent.press(getByText('Message'));
    expect(getAllByText('Message')).toHaveLength(3);
    expect(getAllByText('Primary type')).toBeDefined();
    expect(getAllByText('Permit')).toBeDefined();
    expect(getAllByText('Owner')).toBeDefined();
    expect(getAllByText('0x935E7...05477')).toBeDefined();
    expect(getAllByText('Spender')).toBeDefined();
    expect(getAllByText('0x5B38D...eddC4')).toBeDefined();
    expect(getAllByText('Value')).toBeDefined();
    expect(getAllByText('30')).toBeDefined();
    expect(getAllByText('Nonce')).toBeDefined();
    expect(getAllByText('0')).toBeDefined();
    expect(getAllByText('Deadline')).toBeDefined();
    expect(getAllByText('09 June 3554, 16:53')).toBeDefined();
  });
});
