import { renderHook, act } from '@testing-library/react-native';
import Logger from '../../../../../util/Logger';
import {
  DEFAULT_TX_AMOUNT_LIMIT,
  useNotificationPreferences,
  TX_AMOUNT_THRESHOLDS,
} from './useNotificationPreferences';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationStoragePreferences } from '../../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences';

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock(
  '../../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences',
  () => ({
    useNotificationStoragePreferences: jest.fn(),
  }),
);

const mockUseNotificationStoragePreferences = jest.mocked(
  useNotificationStoragePreferences,
);
const mockUpdatePreferencesSection = jest.fn();
const mockUpdateSectionChannel = jest.fn();

const buildStoragePreferences = (socialAIOverrides = {}) => ({
  walletActivity: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    accounts: [],
  },
  marketing: {
    inAppNotificationsEnabled: false,
    pushNotificationsEnabled: false,
  },
  perps: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
  agenticCli: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
  priceAlerts: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
  socialAI: {
    pushNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    txAmountLimit: DEFAULT_TX_AMOUNT_LIMIT,
    mutedTraderProfileIds: [],
    ...socialAIOverrides,
  },
});

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdatePreferencesSection.mockResolvedValue(undefined);
    mockUpdateSectionChannel.mockResolvedValue(undefined);
    mockUseNotificationStoragePreferences.mockReturnValue({
      preferences: buildStoragePreferences(),
      hasNotificationPreferences: true,
      isLoading: false,
      error: null,
      updatePreferencesSection: mockUpdatePreferencesSection,
      updateSectionChannel: mockUpdateSectionChannel,
      updatePreference: jest.fn(),
      isUpdatingPreferences: false,
      refetch: jest.fn(),
    });
  });

  it('seeds defaults when storage preferences are missing', () => {
    mockUseNotificationStoragePreferences.mockReturnValue({
      preferences: undefined,
      hasNotificationPreferences: false,
      isLoading: false,
      error: null,
      updatePreferencesSection: mockUpdatePreferencesSection,
      updateSectionChannel: mockUpdateSectionChannel,
      updatePreference: jest.fn(),
      isUpdatingPreferences: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useNotificationPreferences());

    expect(result.current.preferences.pushNotificationsEnabled).toBe(true);
    expect(result.current.preferences.inAppNotificationsEnabled).toBe(true);
    expect(result.current.preferences.txAmountLimit).toBe(
      DEFAULT_TX_AMOUNT_LIMIT,
    );
    expect(result.current.preferences.mutedTraderProfileIds).toEqual([]);
    expect(result.current.hasNotificationPreferences).toBe(false);
  });

  it('reflects socialAI preferences from shared storage', () => {
    mockUseNotificationStoragePreferences.mockReturnValue({
      preferences: buildStoragePreferences({
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
        txAmountLimit: 100,
        mutedTraderProfileIds: ['trader-muted'],
      }),
      hasNotificationPreferences: true,
      isLoading: false,
      error: null,
      updatePreferencesSection: mockUpdatePreferencesSection,
      updateSectionChannel: mockUpdateSectionChannel,
      updatePreference: jest.fn(),
      isUpdatingPreferences: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useNotificationPreferences());
    expect(result.current.preferences).toEqual({
      pushNotificationsEnabled: false,
      inAppNotificationsEnabled: false,
      txAmountLimit: 100,
      mutedTraderProfileIds: ['trader-muted'],
    });
    expect(result.current.isTraderNotificationEnabled('trader-muted')).toBe(
      false,
    );
  });

  it('setPushNotificationsEnabled delegates to updateSectionChannel', async () => {
    const { result } = renderHook(() => useNotificationPreferences());

    await act(async () => {
      await result.current.setPushNotificationsEnabled(false);
    });

    expect(mockUpdateSectionChannel).toHaveBeenCalledWith(
      'socialAI',
      'pushNotificationsEnabled',
      false,
    );
  });

  it.each(TX_AMOUNT_THRESHOLDS)(
    'setTxAmountLimit delegates updated section for threshold %s',
    async (threshold) => {
      const { result } = renderHook(() => useNotificationPreferences());
      await act(async () => {
        await result.current.setTxAmountLimit(threshold);
      });

      expect(mockUpdatePreferencesSection).toHaveBeenCalledWith(
        'socialAI',
        expect.any(Function),
      );
      const updater = mockUpdatePreferencesSection.mock.calls[0][1];
      expect(updater(buildStoragePreferences().socialAI)).toEqual(
        expect.objectContaining({
          txAmountLimit: threshold,
        }),
      );
    },
  );

  it('toggleTraderNotification adds trader to muted list when not muted', async () => {
    const { result } = renderHook(() => useNotificationPreferences());
    await act(async () => {
      await result.current.toggleTraderNotification('trader-1');
    });

    expect(mockUpdatePreferencesSection).toHaveBeenCalledWith(
      'socialAI',
      expect.any(Function),
    );
    const updater = mockUpdatePreferencesSection.mock.calls[0][1];
    expect(updater(buildStoragePreferences().socialAI)).toEqual(
      expect.objectContaining({
        mutedTraderProfileIds: ['trader-1'],
      }),
    );
  });

  it('applies default socialAI preferences when stored preferences omit the section', async () => {
    const { socialAI: _socialAI, ...preferencesWithoutSocialAI } =
      buildStoragePreferences();
    mockUseNotificationStoragePreferences.mockReturnValue({
      preferences: preferencesWithoutSocialAI as unknown as ReturnType<
        typeof useNotificationStoragePreferences
      >['preferences'],
      hasNotificationPreferences: true,
      isLoading: false,
      error: null,
      updatePreferencesSection: mockUpdatePreferencesSection,
      updateSectionChannel: mockUpdateSectionChannel,
      updatePreference: jest.fn(),
      isUpdatingPreferences: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useNotificationPreferences());
    await act(async () => {
      await result.current.toggleTraderNotification('trader-1');
    });

    const updater = mockUpdatePreferencesSection.mock.calls[0][1];
    expect(updater(undefined)).toEqual(
      expect.objectContaining({
        mutedTraderProfileIds: ['trader-1'],
      }),
    );
  });

  it('chains rapid trader toggles without losing prior muted ids', async () => {
    const { result } = renderHook(() => useNotificationPreferences());

    await act(async () => {
      const firstToggle = result.current.toggleTraderNotification('trader-1');
      const secondToggle = result.current.toggleTraderNotification('trader-2');
      await Promise.all([firstToggle, secondToggle]);
    });

    expect(mockUpdatePreferencesSection).toHaveBeenNthCalledWith(
      1,
      'socialAI',
      expect.any(Function),
    );
    expect(mockUpdatePreferencesSection).toHaveBeenNthCalledWith(
      2,
      'socialAI',
      expect.any(Function),
    );

    const firstUpdater = mockUpdatePreferencesSection.mock.calls[0][1];
    const secondUpdater = mockUpdatePreferencesSection.mock.calls[1][1];
    const firstPreferences = firstUpdater(buildStoragePreferences().socialAI);
    expect(firstPreferences).toEqual(
      expect.objectContaining({
        mutedTraderProfileIds: ['trader-1'],
      }),
    );
    expect(secondUpdater(firstPreferences)).toEqual(
      expect.objectContaining({
        mutedTraderProfileIds: ['trader-1', 'trader-2'],
      }),
    );
  });

  it('returns user-facing error when preferences are missing and mutator is called', async () => {
    mockUseNotificationStoragePreferences.mockReturnValue({
      preferences: undefined,
      hasNotificationPreferences: false,
      isLoading: false,
      error: null,
      updatePreferencesSection: mockUpdatePreferencesSection,
      updateSectionChannel: mockUpdateSectionChannel,
      updatePreference: jest.fn(),
      isUpdatingPreferences: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useNotificationPreferences());
    await act(async () => {
      await result.current.setPushNotificationsEnabled(false);
    });

    expect(result.current.error).toBe(
      'No notification preferences found when updating social AI preferences, enable notifications first',
    );
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useNotificationPreferences: persist skipped',
    );
  });

  it('surfaces storage query errors', () => {
    mockUseNotificationStoragePreferences.mockReturnValue({
      preferences: buildStoragePreferences(),
      hasNotificationPreferences: true,
      isLoading: false,
      error: new Error('boom'),
      updatePreferencesSection: mockUpdatePreferencesSection,
      updateSectionChannel: mockUpdateSectionChannel,
      updatePreference: jest.fn(),
      isUpdatingPreferences: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useNotificationPreferences());
    expect(result.current.error).toBe('boom');
    expect(Logger.error).toHaveBeenCalled();
  });
});
