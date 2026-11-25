import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import PrivacySettings from './PrivacySettings';

const mockDisableNotifications = jest.fn();
let mockIsNotificationEnabled = true;

jest.mock('../../../util/notifications/hooks/useNotifications', () => ({
  useDisableNotifications: () => ({
    disableNotifications: mockDisableNotifications,
    loading: false,
    error: null,
  }),
}));

jest.mock('../../../selectors/notifications', () => ({
  ...jest.requireActual('../../../selectors/notifications'),
  selectIsMetamaskNotificationsEnabled: () => mockIsNotificationEnabled,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
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
});
