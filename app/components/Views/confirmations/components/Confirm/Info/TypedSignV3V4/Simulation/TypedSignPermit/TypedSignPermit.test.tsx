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

    expect(getByText('Estimated changes')).toBeTruthy();
    expect(
      getByText(
        "You're giving the spender permission to spend this many tokens from your account.",
      ),
    ).toBeTruthy();
    expect(getByText('Spending cap')).toBeTruthy();
    expect(getByText('0xCcCCc...ccccC')).toBeTruthy();

    await waitFor(() => expect(getByText('3,000')).toBeTruthy());
  });

  it('should render correctly for Permit NFTs', async () => {
    const { getByText } = renderWithProvider(<PermitSimulation />, {
      state: typedSignV4NFTConfirmationState,
    });

    expect(getByText('Estimated changes')).toBeTruthy();
    expect(
      getByText(
        "You're giving the spender permission to spend this many tokens from your account.",
      ),
    ).toBeTruthy();
    expect(getByText('Withdraw')).toBeTruthy();
    expect(getByText('0xC3644...1FE88')).toBeTruthy();

    await waitFor(() => expect(getByText('#3606393')).toBeTruthy());
  });
});
