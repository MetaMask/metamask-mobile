import React from 'react';
import DeleteWalletModal from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { DeleteWalletModalSelectorsIDs } from '../../../../e2e/selectors/Settings/SecurityAndPrivacy/DeleteWalletModal.selectors';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { SET_COMPLETED_ONBOARDING } from '../../../actions/onboarding';
import { SafeAreaProvider } from 'react-native-safe-area-context';
const mockInitialState = {
  engine: { backgroundState },
  security: {
    dataCollectionForMarketing: false,
  },
};

const mockUseDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockUseDispatch,
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
    const wrapper = renderWithProvider(
      <SafeAreaProvider>
        <DeleteWalletModal />
      </SafeAreaProvider>,
      {
        state: mockInitialState,
      },
    );

    expect(wrapper).toMatchSnapshot();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('signs the user out when deleting the wallet', async () => {
    const { getByTestId } = renderWithProvider(
      <SafeAreaProvider>
        <DeleteWalletModal />
      </SafeAreaProvider>,
      {
        state: mockInitialState,
      },
    );

    fireEvent.press(getByTestId(DeleteWalletModalSelectorsIDs.CONTINUE_BUTTON));
    fireEvent.press(
      getByTestId(DeleteWalletModalSelectorsIDs.DELETE_PERMANENTLY_BUTTON),
    );

    waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('sets completedOnboarding to false when deleting the wallet', async () => {
    const { getByTestId } = renderWithProvider(
      <SafeAreaProvider>
        <DeleteWalletModal />
      </SafeAreaProvider>,
      {
        state: mockInitialState,
      },
    );

    fireEvent.press(getByTestId(DeleteWalletModalSelectorsIDs.CONTINUE_BUTTON));
    fireEvent.press(
      getByTestId(DeleteWalletModalSelectorsIDs.DELETE_PERMANENTLY_BUTTON),
    );

    waitFor(() => {
      expect(mockUseDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SET_COMPLETED_ONBOARDING,
          completedOnboarding: false,
        }),
      );
    });
  });
});
