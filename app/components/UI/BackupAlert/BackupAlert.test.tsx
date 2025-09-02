import React from 'react';

import BackupAlert from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { PROTECT_WALLET_BUTTON } from './BackupAlert.constants';

const initialState = {
  user: {
    seedphraseBackedUp: false,
    passwordSet: false,
    backUpSeedphraseVisible: true,
  },
};
const mockNavigation = {
  navigate: jest.fn(),
};

jest.mock('../../../util/navigation', () => ({
  useActiveRouteName: jest.fn().mockReturnValue('WalletView'),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));

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
