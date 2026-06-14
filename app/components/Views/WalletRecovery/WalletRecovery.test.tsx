import React from 'react';
import renderWithProvider, {
  type DeepPartial,
} from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';

import WalletRecovery from './index';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    setOptions: jest.fn(),
  }),
}));

jest.mock('../SelectSRP', () => ({
  __esModule: true,
  default: () => null,
}));

describe('WalletRecovery', () => {
  it('renders Telegram-linked social backup details when Telegram is linked', async () => {
    const state = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: {
            authConnection: 'telegram',
            userId: 'user-telegram-1',
            socialLoginEmail: 'user@test.com',
          },
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { findByText } = renderWithProvider(<WalletRecovery />, {
      state,
    });

    const telegramLabel = await findByText(/TELEGRAM/);
    expect(telegramLabel).toBeOnTheScreen();
  });
});
