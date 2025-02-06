import React from 'react';
import { waitFor } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../../../../util/test/renderWithProvider';
import { typedSignV4ConfirmationState, typedSignV4NFTConfirmationState } from '../../../../../../../../../util/test/confirm-data-helpers';
import PermitSimulation from './TypedSignPermit';

jest.mock('../../../../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: () => 'mainnet',
    },
  },
}));

describe('PermitSimulation', () => {
  it('should render correctly for Permit', async () => {
    const { getByText } = renderWithProvider(<PermitSimulation />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Estimated changes')).toBeDefined();
    expect(
      getByText(
        "You're giving the spender permission to spend this many tokens from your account.",
      ),
    ).toBeDefined();
    expect(getByText('Spending cap')).toBeDefined();
    expect(getByText('0xCcCCc...ccccC')).toBeDefined();

    await waitFor(() => expect(getByText('3,000')).toBeDefined());
  });

  it('should render correctly for Permit NFTs', async () => {
    const { getByText } = renderWithProvider(<PermitSimulation />, {
      state: typedSignV4NFTConfirmationState,
    });

    expect(getByText('Estimated changes')).toBeDefined();
    expect(
      getByText(
        "You're giving the spender permission to spend this many tokens from your account.",
      ),
    ).toBeDefined();
    expect(getByText('Withdraw')).toBeDefined();
    expect(getByText('0xC3644...1FE88')).toBeDefined();

    await waitFor(() => expect(getByText('#3606393')).toBeDefined());
  });
});
