import React from 'react';
import DeleteWalletModal from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { RootState } from '../../../reducers';
import { strings } from '../../../../locales/i18n';
import { DeleteWalletModalSelectorsIDs } from '../../../../e2e/selectors/Settings/SecurityAndPrivacy/DeleteWalletModal.selectors';
import { SET_COMPLETED_ONBOARDING } from '../../../actions/onboarding';
import { InteractionManager } from 'react-native';

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

const Stack = createStackNavigator();

const renderComponent = (state: DeepPartial<RootState> = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="DeleteWalletModal" options={{}}>
        {() => <DeleteWalletModal />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('DeleteWalletModal', () => {
  const mockRunAfterInteractions = jest.fn().mockImplementation((cb) => {
    cb();
    return {
      then: (onfulfilled: () => void) => Promise.resolve(onfulfilled()),
      done: (onfulfilled: () => void, onrejected: () => void) =>
        Promise.resolve().then(onfulfilled, onrejected),
      cancel: jest.fn(),
    };
  });
  jest
    .spyOn(InteractionManager, 'runAfterInteractions')
    .mockImplementation(mockRunAfterInteractions);

  describe('bottom sheet', () => {
    it('renders matching snapshot', () => {
      const wrapper = renderComponent(mockInitialState);

      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('forgot password flow', () => {
    it('renders matching snapshot for forgot password', async () => {
      const wrapper = renderComponent(mockInitialState);

      const title = wrapper.getByText(strings('login.forgot_password_desc'));
      expect(title).toBeOnTheScreen();

      const button = wrapper.getByRole('button', {
        name: strings('login.reset_wallet'),
      });
      expect(button).toBeOnTheScreen();

      fireEvent.press(button);

      const title2 = wrapper.getByText(strings('login.are_you_sure'));
      expect(title2).toBeOnTheScreen();

      const button2 = wrapper.getByRole('button', {
        name: strings('login.erase_my'),
      });
      expect(button2).toBeOnTheScreen();

      fireEvent.press(button2);

      // Wait for all promises to resolve
      await Promise.resolve();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('signs the user out when deleting the wallet', async () => {
      const { getByTestId } = renderComponent(mockInitialState);

      fireEvent.press(
        getByTestId(DeleteWalletModalSelectorsIDs.CONTINUE_BUTTON),
      );
      fireEvent.press(
        getByTestId(DeleteWalletModalSelectorsIDs.DELETE_PERMANENTLY_BUTTON),
      );

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('sets completedOnboarding to false when deleting the wallet', async () => {
      const { getByTestId } = renderComponent(mockInitialState);

      fireEvent.press(
        getByTestId(DeleteWalletModalSelectorsIDs.CONTINUE_BUTTON),
      );
      fireEvent.press(
        getByTestId(DeleteWalletModalSelectorsIDs.DELETE_PERMANENTLY_BUTTON),
      );

      expect(mockUseDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SET_COMPLETED_ONBOARDING,
          completedOnboarding: false,
        }),
      );
    });
  });
});
