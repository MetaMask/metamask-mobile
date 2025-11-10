import React from 'react';

import BackupAlert from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { PROTECT_WALLET_BUTTON } from './BackupAlert.constants';
import { backgroundState } from '../../../util/test/initial-root-state';

const initialState = {
  user: {
    seedphraseBackedUp: false,
    passwordSet: false,
    backUpSeedphraseVisible: true,
  },
  engine: {
    backgroundState,
  },
};
const mockNavigation = {
  navigate: jest.fn(),
  dangerouslyGetState: jest.fn(() => ({ routes: [{ name: 'WalletView' }] })),
};

describe('BackupAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <BackupAlert navigation={mockNavigation} onDismiss={() => null} />,
      {
        state: initialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to backupFlow when Protect Wallet button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <BackupAlert navigation={mockNavigation} onDismiss={() => null} />,
      {
        state: initialState,
      },
    );
    const rightButton = getByTestId(PROTECT_WALLET_BUTTON);
    fireEvent.press(rightButton);
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.SET_PASSWORD_FLOW.ROOT,
      {
        screen: Routes.SET_PASSWORD_FLOW.MANUAL_BACKUP_STEP_1,
        params: {
          backupFlow: true,
        },
      },
    );
  });
});
