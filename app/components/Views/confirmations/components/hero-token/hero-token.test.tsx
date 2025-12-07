import React from 'react';

import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import {
  stakingDepositConfirmationState,
  transferConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import { HeroToken } from './hero-token';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { merge } from 'lodash';
import { RootState } from '../../../../../reducers';
import { decGWEIToHexWEI } from '../../../../../util/conversions';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn().mockReturnValue({
    params: {
      maxValueMode: false,
    },
  }),
}));

describe('HeroToken', () => {
  it('displays avatar, amount, and fiat values for a simple send transfer', async () => {
    const state: DeepPartial<RootState> = merge({}, transferConfirmationState, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              { txParams: { value: `0x${decGWEIToHexWEI(55555555)}` } },
            ],
          },
        },
      },
    });
    const { getByText, queryByTestId } = renderWithProvider(<HeroToken />, {
      state,
    });

    await waitFor(async () => {
      expect(queryByTestId('avatar-with-badge-avatar-token-ETH')).toBeTruthy();
      expect(getByText('0.0556 ETH')).toBeDefined();
      expect(getByText('$199.79')).toBeDefined();
    });

    const tokenAmountText = getByText('0.0556 ETH');
    fireEvent.press(tokenAmountText);

    await waitFor(() => {
      expect(getByText('Amount')).toBeDefined();
      expect(getByText('0.055555555')).toBeDefined();
    });
  });

  it('displays avatar, amount, and fiat values for staking deposit', async () => {
    const { getByText, queryByTestId } = renderWithProvider(<HeroToken />, {
      state: stakingDepositConfirmationState,
    });

    await waitFor(async () => {
      expect(queryByTestId('avatar-with-badge-avatar-token-ETH')).toBeTruthy();
      expect(getByText('0.0001 ETH')).toBeDefined();
      expect(getByText('$0.36')).toBeDefined();
    });
  });

  it('displays avatar, rounded amount, amount, and fiat values for staking deposit', async () => {
    const state: DeepPartial<RootState> = merge(
      {},
      stakingDepositConfirmationState,
      {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                { txParams: { value: `0x${decGWEIToHexWEI(12345678.9)}` } },
              ],
            },
          },
        },
      },
    );

    const { getByText, queryByTestId } = renderWithProvider(<HeroToken />, {
      state,
    });

    await waitFor(() => {
      expect(queryByTestId('avatar-with-badge-avatar-token-ETH')).toBeTruthy();
      expect(getByText('0.0123 ETH')).toBeDefined();
      expect(getByText('$44.40')).toBeDefined();
    });

    const tokenAmountText = getByText('0.0123 ETH');
    fireEvent.press(tokenAmountText);

    await waitFor(() => {
      expect(getByText('Amount')).toBeDefined();
      expect(getByText('0.0123456789')).toBeDefined();
    });
  });
});
