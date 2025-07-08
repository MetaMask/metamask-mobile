import React from 'react';
import { Hex } from '@metamask/utils';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { SmartAccountUpdateContent } from './smart-account-update-content';

const renderComponent = (
  state?: Record<string, unknown>,
  selectedAddresses: Hex[] = [],
) =>
  renderWithProvider(
    <SmartAccountUpdateContent selectedAddresses={selectedAddresses} />,
    {
      state: state ?? {
        engine: { backgroundState },
      },
    },
  );

describe('SmartContractWithLogo', () => {
  it('renders correctly', () => {
    const { getByText } = renderComponent();
    expect(getByText('Use smart account?')).toBeTruthy();
    expect(getByText('Faster transactions, lower fees')).toBeTruthy();
    expect(getByText('Pay with any token, any time')).toBeTruthy();
    expect(getByText('Same account, smarter features.')).toBeTruthy();
  });

  it('renders Request For if selected accounts are present', () => {
    const { getByText } = renderComponent(undefined, ['0x1']);
    expect(getByText('Request for')).toBeTruthy();
  });

  it('renders account info if there is an active confirmation', () => {
    const { getByText } = renderComponent(
      getAppStateForConfirmation(upgradeAccountConfirmation, {
        PreferencesController: { smartAccountOptIn: false },
      }),
      ['0x8a0bbcd42cf79e7cee834e7808eb2fef1cebdb87'],
    );
    expect(getByText('Request for')).toBeTruthy();
    expect(getByText('0x8a0bb...bDB87')).toBeTruthy();
  });
});
