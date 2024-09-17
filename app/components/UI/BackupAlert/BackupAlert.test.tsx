import React from 'react';

import BackupAlert from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';

const initialState = {
  user: {
    seedphraseBackedUp: false,
    passwordSet: false,
    backUpSeedphraseVisible: true,
  },
  wizard: {
    step: 0,
  },
};
const mockNavigation = {
  navigate: jest.fn(),
  dangerouslyGetState: jest.fn(() => ({ routes: [{ name: 'WalletView' }] })),
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));

describe('BackupAlert', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <BackupAlert navigation={mockNavigation} onDismiss={() => null} />,
      {
        state: initialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to backup flow when right button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <BackupAlert navigation={mockNavigation} onDismiss={() => null} />,
      {
        state: initialState,
      },
    );
    const rightButton = getByTestId('protect-your-wallet-button');
    fireEvent.press(rightButton);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('SetPasswordFlow', {
      screen: 'AccountBackupStep1',
    });
  });
});
