import React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import {
  InteractionManager,
  ScrollView,
  View,
  type HostInstance,
} from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import SecuritySettings from './SecuritySettings';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { AUTO_LOCK_SECTION } from './Sections/AutoLock/constants';
import {
  CLEAR_BROWSER_HISTORY_SECTION,
  CLEAR_PRIVACY_SECTION,
  DELETE_METRICS_BUTTON,
  META_METRICS_DATA_MARKETING_SECTION,
  META_METRICS_SECTION,
  SDK_SECTION,
  SECURITY_SETTINGS_DELETE_WALLET_BUTTON,
} from './SecuritySettings.constants';
import { SecurityPrivacyViewSelectorsIDs } from './SecurityPrivacyView.testIds';
import SECURITY_ALERTS_TOGGLE_TEST_ID from './constants';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { strings } from '../../../../../locales/i18n';
import ReduxService from '../../../../core/redux/ReduxService';
import { ReduxStore } from '../../../../core/redux/types';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { BASIC_FUNCTIONALITY_SWITCH_TEST_ID } from '../../../UI/BasicFunctionality/BasicFunctionality.constants';
import { endTrace, trace, TraceName } from '../../../../util/trace';

const BELOW_FOLD_PLACEHOLDER_TEST_ID =
  'security-settings-below-fold-placeholder';

let mockIsTransitionComplete = true;

type MockTransitionListener = (event: { data: { closing: boolean } }) => void;
const mockTransitionEndListeners = new Set<MockTransitionListener>();

jest.mock('../../../hooks/useScreenTransitionComplete', () => ({
  useScreenTransitionComplete: () => mockIsTransitionComplete,
}));

jest.mock('../../../../util/trace', () => {
  const actual = jest.requireActual('../../../../util/trace');
  return {
    ...actual,
    trace: jest.fn(),
    endTrace: jest.fn(),
  };
});
const initialState = {
  privacy: { approvedHosts: {} },
  browser: { history: [] },
  settings: { lockTime: 1000, basicFunctionalityEnabled: true },
  user: { passwordSet: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      UserStorageController: {
        isBackupAndSyncEnabled: false,
      },
    },
  },
  security: {
    allowLoginWithRememberMe: true,
  },
};

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  setOptions: mockSetOptions,
  goBack: mockGoBack,
  addListener: (eventName: string, listener: MockTransitionListener) => {
    if (eventName !== 'transitionEnd') {
      return () => undefined;
    }
    mockTransitionEndListeners.add(listener);
    return () => {
      mockTransitionEndListeners.delete(listener);
    };
  },
};

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => mockNavigation,
    useFocusEffect: jest.fn((callback: () => void) => callback()),
  };
});

jest.mock('@react-native-cookies/cookies', () => ({
  clearAll: jest.fn(),
  getAll: jest.fn().mockResolvedValue({}),
}));

let mockUseParamsValues: {
  scrollToSection?: 'metametrics' | 'data-collection';
} = {
  scrollToSection: undefined,
};

jest.mock('../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

// DeviceSecurityToggle uses useAuthCapabilities; mock so it renders the toggle instead of null
jest.mock('../../../../core/Authentication/hooks/useAuthCapabilities', () => ({
  __esModule: true,
  default: () => ({
    isLoading: false,
    capabilities: {
      isBiometricsAvailable: true,
      passcodeAvailable: true,
      authLabel: 'Face ID',
      osAuthEnabled: false,
      allowLoginWithRememberMe: false,
      authType: 'biometrics',
      deviceAuthRequiresSettings: false,
    },
  }),
}));

describe('SecuritySettings', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockClear();
    mockIsTransitionComplete = true;
    mockTransitionEndListeners.clear();
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = jest.fn();
    mockUseParamsValues = {
      scrollToSection: undefined,
    };

    jest
      .spyOn(ScrollView.prototype, 'getNativeScrollRef')
      .mockReturnValue({} as HostInstance);

    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((callback) => {
        setTimeout(() => {
          if (typeof callback === 'function') callback();
        }, 0);
        return { then: jest.fn(), done: jest.fn(), cancel: jest.fn() };
      });

    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      dispatch: jest.fn(),
      getState: () => ({
        user: { existingUser: false },
        security: { allowLoginWithRememberMe: true },
        settings: { lockTime: 1000 },
      }),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
      [Symbol.observable]: jest.fn(),
    } as unknown as ReduxStore);
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
    jest.restoreAllMocks();
  });

  const emitTransitionEnd = (closing = false) => {
    act(() => {
      mockTransitionEndListeners.forEach((listener) => {
        listener({ data: { closing } });
      });
    });
  };
  it('renders correctly', () => {
    const { getByText } = renderWithProvider(<SecuritySettings />, {
      state: initialState,
    });
    expect(getByText(strings('app_settings.security_title'))).toBeOnTheScreen();
  });

  it('renders the metametrics sections when scrollToSection param is set', () => {
    mockUseParamsValues = {
      scrollToSection: 'data-collection',
    };
    const { getByTestId } = renderWithProvider(<SecuritySettings />, {
      state: initialState,
    });
    expect(getByTestId(META_METRICS_SECTION)).toBeOnTheScreen();
    expect(getByTestId(META_METRICS_DATA_MARKETING_SECTION)).toBeOnTheScreen();
  });

  it.each(['metametrics', 'data-collection'] as const)(
    'scrolls to the %s section when scrollToSection param is set',
    async (scrollToSection) => {
      const measuredSectionTop = 42;
      const measureLayoutSpy = jest
        .spyOn(View.prototype, 'measureLayout')
        .mockImplementationOnce((_node, onSuccess) =>
          onSuccess(0, measuredSectionTop, 0, 0),
        );
      const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo');

      mockUseParamsValues = { scrollToSection };
      renderWithProvider(<SecuritySettings />, { state: initialState });

      await waitFor(() =>
        expect(scrollToSpy).toHaveBeenCalledWith({
          y: measuredSectionTop,
          animated: true,
        }),
      );

      measureLayoutSpy.mockRestore();
      scrollToSpy.mockRestore();
    },
  );

  it('does not measure when the native scroll ref is unavailable', async () => {
    jest
      .spyOn(ScrollView.prototype, 'getNativeScrollRef')
      .mockReturnValue(null);
    const measureLayoutSpy = jest.spyOn(View.prototype, 'measureLayout');

    mockUseParamsValues = { scrollToSection: 'metametrics' };
    renderWithProvider(<SecuritySettings />, { state: initialState });

    await waitFor(() =>
      expect(InteractionManager.runAfterInteractions).toHaveBeenCalled(),
    );
    expect(measureLayoutSpy).not.toHaveBeenCalled();

    measureLayoutSpy.mockRestore();
  });

  it('does not scroll when the section layout cannot be measured', async () => {
    const measureLayoutSpy = jest
      .spyOn(View.prototype, 'measureLayout')
      .mockImplementationOnce((_node, _onSuccess, onFail) => onFail?.());
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo');

    mockUseParamsValues = { scrollToSection: 'metametrics' };
    renderWithProvider(<SecuritySettings />, { state: initialState });

    await waitFor(() => expect(measureLayoutSpy).toHaveBeenCalled());
    expect(scrollToSpy).not.toHaveBeenCalled();

    measureLayoutSpy.mockRestore();
    scrollToSpy.mockRestore();
  });

  it('renders inline header with Security and privacy title', () => {
    const { getByText } = renderWithProvider(<SecuritySettings />, {
      state: initialState,
    });
    expect(getByText(strings('app_settings.security_title'))).toBeTruthy();
  });

  it('calls navigation.goBack when header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<SecuritySettings />, {
      state: initialState,
    });
    const header = getByTestId('header');
    const backButton = within(header).getByTestId('button-icon');
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders all sections without SDK section (SDK is in account menu)', () => {
    const { getByText, getByTestId, queryByTestId } = renderWithProvider(
      <SecuritySettings />,
      {
        state: initialState,
      },
    );
    expect(getByText(strings('app_settings.protect_title'))).toBeTruthy();
    expect(
      getByTestId(SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER),
    ).toBeTruthy();
    expect(getByTestId(AUTO_LOCK_SECTION)).toBeTruthy();
    expect(
      getByTestId(SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE),
    ).toBeTruthy();
    expect(queryByTestId(SDK_SECTION)).not.toBeOnTheScreen();
    expect(getByTestId(CLEAR_PRIVACY_SECTION)).toBeTruthy();
    expect(getByTestId(CLEAR_BROWSER_HISTORY_SECTION)).toBeTruthy();
    expect(getByTestId(META_METRICS_SECTION)).toBeTruthy();
    expect(getByTestId(DELETE_METRICS_BUTTON)).toBeTruthy();
    expect(getByTestId(META_METRICS_DATA_MARKETING_SECTION)).toBeTruthy();
    expect(getByTestId(SECURITY_SETTINGS_DELETE_WALLET_BUTTON)).toBeTruthy();
  });

  it('renders Blockaid settings', async () => {
    const { getByTestId, findByText } = renderWithProvider(
      <SecuritySettings />,
      {
        state: initialState,
      },
    );

    expect(await findByText('Security alerts')).toBeDefined();
    const toggle = getByTestId(SECURITY_ALERTS_TOGGLE_TEST_ID);
    expect(toggle).toBeDefined();
    expect(toggle.props.value).toBe(true);
  });

  describe('Basic Functionality switch for a consolidated social wallet', () => {
    const socialWalletState = (basicFunctionalityEnabled: boolean) => ({
      ...initialState,
      settings: {
        ...initialState.settings,
        basicFunctionalityEnabled,
        isBasicFunctionalityConsolidatedEnabled: true,
      },
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          SeedlessOnboardingController: {
            authConnection: AuthConnection.Google,
          },
        },
      },
    });

    it('locks the switch while Basic Functionality is on', () => {
      const { getByTestId } = renderWithProvider(<SecuritySettings />, {
        state: socialWalletState(true),
      });

      expect(
        getByTestId(BASIC_FUNCTIONALITY_SWITCH_TEST_ID).props.disabled,
      ).toBe(true);
    });

    it('leaves the switch usable when Basic Functionality is off', () => {
      // Consolidation repairs an off social wallet, but that repair writes
      // nothing if the service call rejects and only re-runs on unlock, so
      // Settings has to stay the way back on.
      const { getByTestId } = renderWithProvider(<SecuritySettings />, {
        state: socialWalletState(false),
      });

      expect(
        getByTestId(BASIC_FUNCTIONALITY_SWITCH_TEST_ID).props.disabled,
      ).toBe(false);
    });
  });

  it('keeps the security block immediate and defers the privacy tail until transitionEnd', () => {
    mockIsTransitionComplete = false;
    const queuedFrames: FrameRequestCallback[] = [];
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      queuedFrames.push(callback);
      return queuedFrames.length;
    }) as typeof requestAnimationFrame;

    const view = renderWithProvider(<SecuritySettings />, {
      state: initialState,
    });

    expect(
      view.getByText(strings('app_settings.protect_title')),
    ).toBeOnTheScreen();
    expect(view.getByTestId(BELOW_FOLD_PLACEHOLDER_TEST_ID)).toBeOnTheScreen();
    expect(view.queryByTestId(CLEAR_PRIVACY_SECTION)).toBeNull();
    expect(view.queryByTestId(META_METRICS_SECTION)).toBeNull();
    expect(
      view.queryByTestId(SECURITY_SETTINGS_DELETE_WALLET_BUTTON),
    ).toBeNull();
    expect(trace).not.toHaveBeenCalled();

    emitTransitionEnd();

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.SecuritySettingsBelowFoldContentReady,
        op: 'ui.startup',
        id: 'security-settings-below-fold',
        data: { deferred: true },
      }),
    );
    expect(endTrace).not.toHaveBeenCalled();

    mockIsTransitionComplete = true;
    view.rerender(<SecuritySettings />);

    act(() => {
      const frame = queuedFrames.shift();
      if (!frame) {
        throw new Error('expected a pending animation frame');
      }
      frame(0);
    });

    expect(
      view.getByTestId(SECURITY_SETTINGS_DELETE_WALLET_BUTTON),
    ).toBeOnTheScreen();
    expect(view.getByTestId(CLEAR_PRIVACY_SECTION)).toBeOnTheScreen();
    expect(view.getByTestId(META_METRICS_SECTION)).toBeOnTheScreen();
    expect(view.queryByTestId(BELOW_FOLD_PLACEHOLDER_TEST_ID)).toBeNull();
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.SecuritySettingsBelowFoldContentReady,
        id: 'security-settings-below-fold',
        data: { success: true, deferred: true },
      }),
    );
  });

  it('ends the below-fold span immediately when content is already ready at transitionEnd', () => {
    renderWithProvider(<SecuritySettings />, { state: initialState });

    emitTransitionEnd();

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.SecuritySettingsBelowFoldContentReady,
      }),
    );
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.SecuritySettingsBelowFoldContentReady,
        data: { success: true, deferred: true },
      }),
    );
  });

  it('ignores a closing transitionEnd', () => {
    renderWithProvider(<SecuritySettings />, { state: initialState });

    emitTransitionEnd(true);

    expect(trace).not.toHaveBeenCalled();
  });
});
