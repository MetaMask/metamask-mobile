import React from 'react';
import {
  InteractionManager,
  ScrollView,
  View,
  type HostInstance,
} from 'react-native';
import { waitFor } from '@testing-library/react-native';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';

import renderWithProvider from '#app/util/test/renderWithProvider';
import { backgroundState } from '#app/util/test/initial-root-state';
import { BASIC_FUNCTIONALITY_SWITCH_TEST_ID } from '#app/components/UI/BasicFunctionality/BasicFunctionality.constants';

import PrivacySettings from './PrivacySettings';
import { META_METRICS_SECTION } from '../SecuritySettings/SecuritySettings.constants';

let mockUseParamsValues: {
  scrollToSection?: 'metametrics' | 'data-collection';
} = {};

jest.mock('#app/util/navigation/navUtils', () => ({
  ...jest.requireActual('#app/util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

const mockDisableNotifications = jest.fn();
let mockIsNotificationEnabled = true;

jest.mock('#app/util/notifications/hooks/useNotifications', () => ({
  useDisableNotifications: () => ({
    disableNotifications: mockDisableNotifications,
    loading: false,
    error: null,
  }),
}));

jest.mock('#app/selectors/notifications', () => ({
  ...jest.requireActual('#app/selectors/notifications'),
  selectIsMetamaskNotificationsEnabled: () => mockIsNotificationEnabled,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('@react-native-cookies/cookies', () => ({
  clearAll: jest.fn(),
  getAll: jest.fn().mockResolvedValue({}),
}));

const buildState = (basicFunctionalityEnabled: boolean) => ({
  privacy: { approvedHosts: {} },
  browser: { history: [] },
  settings: { basicFunctionalityEnabled },
  security: { dataCollectionForMarketing: false },
  engine: { backgroundState },
});

describe('PrivacySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNotificationEnabled = true;
    mockUseParamsValues = {};

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('disables notifications when basic functionality is off', () => {
    renderWithProvider(<PrivacySettings />, { state: buildState(false) });

    expect(mockDisableNotifications).toHaveBeenCalledTimes(1);
  });

  it('does not disable notifications when basic functionality is on', () => {
    renderWithProvider(<PrivacySettings />, { state: buildState(true) });

    expect(mockDisableNotifications).not.toHaveBeenCalled();
  });

  it('does not disable notifications when they are already off', () => {
    mockIsNotificationEnabled = false;

    renderWithProvider(<PrivacySettings />, { state: buildState(false) });

    expect(mockDisableNotifications).not.toHaveBeenCalled();
  });

  it('renders the metametrics section', () => {
    const { getByTestId } = renderWithProvider(<PrivacySettings />, {
      state: buildState(true),
    });

    expect(getByTestId(META_METRICS_SECTION)).toBeOnTheScreen();
  });

  it.each(['metametrics', 'data-collection'] as const)(
    'scrolls to the %s section when scrollToSection param is set',
    async (scrollToSection) => {
      const measuredSectionTop = 42;
      jest
        .spyOn(View.prototype, 'measureLayout')
        .mockImplementationOnce((_node, onSuccess) =>
          onSuccess(0, measuredSectionTop, 0, 0),
        );
      const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo');

      mockUseParamsValues = { scrollToSection };
      renderWithProvider(<PrivacySettings />, { state: buildState(true) });

      await waitFor(() =>
        expect(scrollToSpy).toHaveBeenCalledWith({
          y: measuredSectionTop,
          animated: true,
        }),
      );
    },
  );

  it('does not measure when the native scroll ref is unavailable', async () => {
    jest.useFakeTimers();
    let callbackInvoked = false;
    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((callback) => {
        setTimeout(() => {
          if (typeof callback === 'function') {
            callback();
            callbackInvoked = true;
          }
        }, 0);
        return { then: jest.fn(), done: jest.fn(), cancel: jest.fn() };
      });

    jest
      .spyOn(ScrollView.prototype, 'getNativeScrollRef')
      .mockReturnValue(null);
    const measureLayoutSpy = jest.spyOn(View.prototype, 'measureLayout');

    mockUseParamsValues = { scrollToSection: 'metametrics' };
    renderWithProvider(<PrivacySettings />, { state: buildState(true) });

    await waitFor(() =>
      expect(InteractionManager.runAfterInteractions).toHaveBeenCalled(),
    );
    jest.runAllTimers();
    await waitFor(() => expect(callbackInvoked).toBe(true));
    expect(measureLayoutSpy).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('does not scroll when the section layout cannot be measured', async () => {
    const measureLayoutSpy = jest
      .spyOn(View.prototype, 'measureLayout')
      .mockImplementationOnce((_node, _onSuccess, onFail) => onFail?.());
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo');

    mockUseParamsValues = { scrollToSection: 'metametrics' };
    renderWithProvider(<PrivacySettings />, { state: buildState(true) });

    await waitFor(() => expect(measureLayoutSpy).toHaveBeenCalled());
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  describe('Basic Functionality switch for a consolidated social wallet', () => {
    const socialWalletState = (basicFunctionalityEnabled: boolean) => ({
      privacy: { approvedHosts: {} },
      browser: { history: [] },
      settings: {
        basicFunctionalityEnabled,
        isBasicFunctionalityConsolidatedEnabled: true,
      },
      security: { dataCollectionForMarketing: false },
      engine: {
        backgroundState: {
          ...backgroundState,
          SeedlessOnboardingController: {
            authConnection: AuthConnection.Google,
          },
        },
      },
    });

    it('locks the switch while Basic Functionality is on', () => {
      const { getByTestId } = renderWithProvider(<PrivacySettings />, {
        state: socialWalletState(true),
      });

      expect(
        getByTestId(BASIC_FUNCTIONALITY_SWITCH_TEST_ID).props.disabled,
      ).toBe(true);
    });

    it('leaves the switch usable when Basic Functionality is off', () => {
      const { getByTestId } = renderWithProvider(<PrivacySettings />, {
        state: socialWalletState(false),
      });

      expect(
        getByTestId(BASIC_FUNCTIONALITY_SWITCH_TEST_ID).props.disabled,
      ).toBe(false);
    });
  });
});
