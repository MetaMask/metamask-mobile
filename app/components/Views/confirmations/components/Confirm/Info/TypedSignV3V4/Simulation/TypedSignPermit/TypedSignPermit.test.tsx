import React from 'react';

import renderWithProvider from '../../../../../../../../../util/test/renderWithProvider';
import { typedSignV4ConfirmationState } from '../../../../../../../../../util/test/confirm-data-helpers';
import PermitSimulation from './TypedSignPermit';

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: () => 'mainnet',
    },
  },
}));

describe('PermitSimulation', () => {
  it('should render correctly for personal sign', async () => {
    const { getByText } = renderWithProvider(<PermitSimulation />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Estimated changes')).toBeDefined();
    expect(getByText('You’re giving the spender permission to spend this many tokens from your account.')).toBeDefined();
    expect(getByText('Spending cap')).toBeDefined();
    expect(getByText('3,000')).toBeDefined();
    expect(getByText('0xCcCCc...ccccC')).toBeDefined();
  });
});
