import React from 'react';
import { act, waitFor } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../../../../util/test/renderWithProvider';
import {
  SignTypedDataMockType,
  generateStateSignTypedData,
  typedSignV4ConfirmationState,
} from '../../../../../../../../../util/test/confirm-data-helpers';
import PermitSimulation from './TypedSignPermit';

jest.mock('../../../../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: () => 'mainnet',
    },
  },
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
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

  it('should render correctly for DAI Revoke', async () => {
    const { getByText } = renderWithProvider(<PermitSimulation />, {
      state: generateStateSignTypedData(SignTypedDataMockType.DAI),
    });

    expect(getByText('Estimated changes')).toBeTruthy();
    expect(
      getByText(
        "You're revoking permission for the spender to spend tokens from your account.",
      ),
    ).toBeTruthy();
    expect(getByText('Revoke')).toBeTruthy();
    expect(getByText('0x6B175...71d0F')).toBeTruthy();
  });
});
