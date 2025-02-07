import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../../../util/test/confirm-data-helpers';
import Info from './Info';

jest.mock('../../../../../../core/Engine', () => ({
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

describe('Info', () => {
  it('should render correctly for personal sign', async () => {
    const { getByText } = renderWithProvider(<Info />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
  });

  describe('Staking Deposit', () => {
    it('should render correctly', async () => {
      const { getByText } = renderWithProvider(<Info />, {
        state: stakingDepositConfirmationState,
      });
      expect(getByText('Stake')).toBeDefined();
    });
  });
});
