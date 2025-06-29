// Mock react-native components for testing
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return { ...RN };
});

import React from 'react';
import { renderScreen } from '../../../util/test/renderWithProvider';
import Onboarding from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Device from '../../../util/device';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';
import { InteractionManager, BackHandler, Animated } from 'react-native';
import StorageWrapper from '../../../store/storage-wrapper';
import { EXISTING_USER } from '../../../constants/storage';
import { Authentication } from '../../../core';
import Routes from '../../../constants/navigation/Routes';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
  user: {
    passwordSet: false,
    loadingSet: false,
    loadingMsg: '',
  },
};

const mockInitialStateWithPassword = {
  ...mockInitialState,
  user: {
    ...mockInitialState.user,
    passwordSet: true,
  },
};

jest.mock('../../../util/device', () => ({
  isLargeDevice: jest.fn(),
  isIphoneX: jest.fn(),
  isAndroid: jest.fn(),
  isIos: jest.fn(),
}));

// expo library are not supported in jest ( unless using jest-expo as preset ), so we need to mock them
jest.mock('../../../core/OAuthService/OAuthLoginHandlers', () => ({
  createLoginHandler: jest.fn(),
}));

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
}));

jest.mock('../../../core', () => ({
  Authentication: {
    resetVault: jest.fn(),
    lockApp: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockNav = {
  navigate: mockNavigate,
  replace: mockReplace,
  reset: jest.fn(),
  setOptions: jest.fn(),
};
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: ({
      component: ScreenComponent,
      initialParams,
    }: {
      component: React.ComponentType<{
        navigation: Record<string, unknown>;
        route: { params: Record<string, unknown> };
      }>;
      initialParams: Record<string, unknown>;
    }) => (
        <ScreenComponent
          navigation={mockNav}
          route={{ params: initialParams || {} }}
        />
      ),
  }),
}));

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

describe('Onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({
      remove: jest.fn(),
    }));

    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with large device and iphoneX', () => {
    (Device.isLargeDevice as jest.Mock).mockReturnValue(true);
    (Device.isIphoneX as jest.Mock).mockReturnValue(true);
    (Device.isAndroid as jest.Mock).mockReturnValue(false);
    (Device.isIos as jest.Mock).mockReturnValue(true);

    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with android', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (Device.isLargeDevice as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);

    const { toJSON } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should click on create wallet button', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (Device.isLargeDevice as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );

    const createWalletButton = getByTestId(
      OnboardingSelectorIDs.NEW_WALLET_BUTTON,
    );
    fireEvent.press(createWalletButton);
  });

  it('should click on import seed button', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (Device.isLargeDevice as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderScreen(
      Onboarding,
      { name: 'Onboarding' },
      {
        state: mockInitialState,
      },
    );

    const importSeedButton = getByTestId(
      OnboardingSelectorIDs.IMPORT_SEED_BUTTON,
    );
    fireEvent.press(importSeedButton);
  });

  describe('Create wallet flow', () => {
    it('should navigate to onboarding sheet when create wallet is pressed for new user', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const createWalletButton = getByTestId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );

      await act(async () => {
        fireEvent.press(createWalletButton);
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.ONBOARDING_SHEET,
          params: expect.objectContaining({
            createWallet: true,
          }),
        })
      );
    });
  });

  describe('Import wallet flow', () => {
    it('should navigate to onboarding sheet when import wallet is pressed for new user', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

      const { getByTestId } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      const importSeedButton = getByTestId(
        OnboardingSelectorIDs.IMPORT_SEED_BUTTON,
      );

      await act(async () => {
        fireEvent.press(importSeedButton);
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.ONBOARDING_SHEET,
          params: expect.objectContaining({
            createWallet: false,
          }),
        })
      );
    });
  });

  describe('Navigation behavior', () => {
    it('should navigate to HOME_NAV when unlock is pressed and password is not set', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue('existingUser');

      const { getByText } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      await waitFor(() => {
        expect(getByText('Unlock')).toBeTruthy();
      });

      const unlockButton = getByText('Unlock');

      await act(async () => {
        fireEvent.press(unlockButton);
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(Authentication.resetVault).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
    });

    it('should navigate to LOGIN when unlock is pressed and password is set', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue('existingUser');

      const { getByText } = renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialStateWithPassword,
        },
      );

      await waitFor(() => {
        expect(getByText('Unlock')).toBeTruthy();
      });

      const unlockButton = getByText('Unlock');

      await act(async () => {
        fireEvent.press(unlockButton);
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(Authentication.lockApp).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.LOGIN);
    });
  });

  describe('componentDidMount behavior', () => {
    it('should check for existing user on mount', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue('existingUser');

      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      await waitFor(() => {
        expect(StorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
      });
    });

    it('should disable back press when component mounts', () => {
      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
      );

      expect(BackHandler.addEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
    });

    it('should trigger animatedTimingStart', async () => {
      jest.useFakeTimers();

      const animatedTimingSpy = jest.spyOn(Animated, 'timing');

      renderScreen(
        Onboarding,
        { name: 'Onboarding' },
        {
          state: mockInitialState,
        },
        { route: { params: { delete: true } } },
      );

      await waitFor(() => {
        expect(StorageWrapper.getItem).toHaveBeenCalled();
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(animatedTimingSpy).toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(4000);
      });

      expect(animatedTimingSpy.mock.calls.length).toBeGreaterThan(0);

      animatedTimingSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});
