import React from 'react';
import { waitFor } from '@testing-library/react-native';

import { backgroundState } from '../../../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import {
  SignTypedDataMockType,
  generateStateSignTypedData,
  typedSignV4ConfirmationState,
  typedSignV4NFTConfirmationState,
} from '../../../../../../../../util/test/confirm-data-helpers';
import PermitSimulation from './typed-sign-permit';

jest.mock('../../../../../../../../core/Engine', () => ({
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
  it('renders for Permit', async () => {
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

  it('renders null when no message data is found', async () => {
    const { queryByText } = renderWithProvider(<PermitSimulation />, {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
          },
        },
      },
    });
    expect(queryByText('Estimated changes')).toBeNull();
  });

  it('renders for DAI Revoke', async () => {
    const { getByText } = renderWithProvider(<PermitSimulation />, {
      state: generateStateSignTypedData(SignTypedDataMockType.DAI),
    });

    expect(getByText('Estimated changes')).toBeTruthy();
    expect(
      getByText(
        "You're removing someone's permission to spend tokens from your account.",
      ),
    ).toBeTruthy();
    expect(getByText('Revoke')).toBeTruthy();
    expect(getByText('0x6B175...71d0F')).toBeTruthy();
  });

  it('renders for Permit Batch', async () => {
    const { getByText } = renderWithProvider(<PermitSimulation />, {
      state: generateStateSignTypedData(SignTypedDataMockType.BATCH),
    });

    expect(
      getByText(
        "You're giving the spender permission to spend this many tokens from your account.",
      ),
    ).toBeTruthy();
    expect(getByText('Spending cap')).toBeTruthy();
    expect(getByText('0xA0b86...6eB48')).toBeTruthy();
    expect(getByText('0xb0B86...6EB48')).toBeTruthy();

    await waitFor(() => expect(getByText('1,461,501,637,3...')).toBeTruthy());
    await waitFor(() => expect(getByText('250')).toBeTruthy());
  });

  it('renders for Permit NFTs', async () => {
    const { getByText } = renderWithProvider(<PermitSimulation />, {
      state: typedSignV4NFTConfirmationState,
    });

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
