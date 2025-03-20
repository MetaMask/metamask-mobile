// Third party dependencies.
import React from 'react';

// Internal dependencies.
import ProfileSyncingComponent from './ProfileSyncing';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      UserStorageController: {
        isProfileSyncingEnabled: true,
      },
      AuthenticationController: {
        isSignedIn: true,
      },
    },
  },
  settings: {
    basicFunctionalityEnabled: true,
  },
};

const { InteractionManager } = jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockEnableProfileSyncing = jest.fn();
const mockDisableProfileSyncing = jest.fn();
jest.mock('../../../util/identity/hooks/useProfileSyncing', () => ({
  useEnableProfileSyncing: () => ({
    enableProfileSyncing: mockEnableProfileSyncing,
  }),
  useDisableProfileSyncing: () => ({
    disableProfileSyncing: mockDisableProfileSyncing,
  }),
}));

const handleSwitchToggle = jest.fn();

describe('ProfileSyncing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <ProfileSyncingComponent handleSwitchToggle={handleSwitchToggle} />,
      {
        state: MOCK_STORE_STATE,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('disables profile syncing when basic functionality is disabled', async () => {
    const { store } = renderWithProvider(
      <ProfileSyncingComponent handleSwitchToggle={handleSwitchToggle} />,
      {
        state: MOCK_STORE_STATE,
      },
    );

    act(() => {
      store.dispatch({
        type: 'TOGGLE_BASIC_FUNCTIONALITY',
        payload: false,
      });
    });

    await waitFor(() => {
      expect(mockDisableProfileSyncing).toHaveBeenCalled();
    });
  });

  it('enables profile syncing when toggling the switch on', async () => {
    const { getByRole } = renderWithProvider(
      <ProfileSyncingComponent handleSwitchToggle={handleSwitchToggle} />,
      {
        state: {
          ...MOCK_STORE_STATE,
          engine: {
            backgroundState: {
              ...MOCK_STORE_STATE.engine.backgroundState,
              UserStorageController: {
                isProfileSyncingEnabled: false,
              },
            },
          },
        },
      },
    );

    const switchElement = getByRole('switch');

    // Toggle on
    act(() => {
      fireEvent(switchElement, 'onValueChange', true);
    });

    await waitFor(() => {
      expect(mockEnableProfileSyncing).toHaveBeenCalled();
    });
  });

  it('executes a callback when toggling the switch', () => {
    const { getByRole } = renderWithProvider(
      <ProfileSyncingComponent handleSwitchToggle={handleSwitchToggle} />,
    );

    const switchElement = getByRole('switch');

    // Toggle on
    fireEvent(switchElement, 'onValueChange', true);

    expect(handleSwitchToggle).toHaveBeenCalled();
  });

  it('opens a modal when toggling profile syncing off', () => {
    const { getByRole } = renderWithProvider(
      <ProfileSyncingComponent handleSwitchToggle={handleSwitchToggle} />,
    );

    const switchElement = getByRole('switch');

    // Toggle off
    fireEvent(switchElement, 'onValueChange', false);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.PROFILE_SYNCING,
    });
  });
});
