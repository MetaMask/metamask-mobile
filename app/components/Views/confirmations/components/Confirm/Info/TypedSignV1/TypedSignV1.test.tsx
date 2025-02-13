import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { typedSignV1ConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import TypedSignV1 from './TypedSignV1';

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getOrAddQRKeyring: jest.fn(),
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
