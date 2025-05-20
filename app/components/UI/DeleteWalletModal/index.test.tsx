import React from 'react';
import DeleteWalletModal from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { DeleteWalletModalSelectorsIDs } from '../../../../e2e/selectors/Settings/SecurityAndPrivacy/DeleteWalletModal.selectors';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { SET_COMPLETED_ONBOARDING } from '../../../actions/onboarding';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { RootState } from '../../../reducers';

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
  it('should render correctly', () => {
    const wrapper = renderComponent(mockInitialState);

    expect(wrapper).toMatchSnapshot();
  });

  it('signs the user out when deleting the wallet', async () => {
    const { getByTestId } = renderComponent(mockInitialState);
    fireEvent.press(
      getByTestId(DeleteWalletModalSelectorsIDs.DELETE_PERMANENTLY_BUTTON),
    );

    waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('sets completedOnboarding to false when deleting the wallet', async () => {
    const { getByTestId } = renderComponent(mockInitialState);

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
