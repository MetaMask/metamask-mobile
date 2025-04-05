import React from 'react';
import DeleteWalletModal from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { DeleteWalletModalSelectorsIDs } from '../../../../e2e/selectors/Settings/SecurityAndPrivacy/DeleteWalletModal.selectors';
import { fireEvent, waitFor } from '@testing-library/react-native';

const mockInitialState = {
  engine: { backgroundState },
  security: {
    dataCollectionForMarketing: false,
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
  useSelector: jest.fn(),
}));
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

jest.mock('@react-native-cookies/cookies', () => ({
  set: jest.fn(),
  get: jest.fn(),
  clearAll: jest.fn(),
}));

const mockSignOut = jest.fn();

jest.mock('../../../util/identity/hooks/useAuthentication', () => ({
  useSignOut: () => ({
    signOut: mockSignOut,
  }),
}));

jest.mock('../../hooks/DeleteWallet', () => ({
  useDeleteWallet: () => [
    jest.fn(() => Promise.resolve()),
    jest.fn(() => Promise.resolve()),
  ],
}));

describe('DeleteWalletModal', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(<DeleteWalletModal />, {
      state: mockInitialState,
    });

    expect(wrapper).toMatchSnapshot();
  });

  it('signs the user out when deleting the wallet', async () => {
    const { getByTestId } = renderWithProvider(<DeleteWalletModal />, {
      state: mockInitialState,
    });

    fireEvent.press(getByTestId(DeleteWalletModalSelectorsIDs.CONTINUE_BUTTON));
    fireEvent.press(
      getByTestId(DeleteWalletModalSelectorsIDs.DELETE_PERMANENTLY_BUTTON),
    );

    waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
