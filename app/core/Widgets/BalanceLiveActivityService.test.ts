import { Platform } from 'react-native';

import ReduxService from '../redux/ReduxService';
import { selectPrivacyMode } from '../../selectors/preferencesController';
import { BalanceLiveActivity } from './liveActivities/BalanceLiveActivity';
import { endLiveActivitiesFromPreviousLaunch } from './reconcileLiveActivities';
import {
  formatSelectedAccountGroupBalance,
  getSelectedAccountGroupName,
} from './balanceSnapshot';
import { BalanceLiveActivityServiceImplementation } from './BalanceLiveActivityService';

jest.mock('./liveActivities/BalanceLiveActivity', () => ({
  BALANCE_LIVE_ACTIVITY_NAME: 'BalanceLiveActivity',
  BalanceLiveActivity: { start: jest.fn(), getInstances: jest.fn(() => []) },
}));

jest.mock('./reconcileLiveActivities', () => ({
  endLiveActivitiesFromPreviousLaunch: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./balanceSnapshot', () => ({
  formatSelectedAccountGroupBalance: jest.fn(),
  getSelectedAccountGroupName: jest.fn(),
}));

jest.mock('../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(),
}));

jest.mock('../../../locales/i18n', () => ({
  __esModule: true,
  strings: jest.fn((key: string) => key),
  default: { locale: 'en-US' },
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

describe('BalanceLiveActivityService', () => {
  const mockStart = jest.mocked(BalanceLiveActivity.start);
  const mockFormatBalance = jest.mocked(formatSelectedAccountGroupBalance);
  const mockGetAccountName = jest.mocked(getSelectedAccountGroupName);
  const mockSelectPrivacyMode = jest.mocked(selectPrivacyMode);

  let service: BalanceLiveActivityServiceImplementation;
  let activity: { update: jest.Mock; end: jest.Mock };
  let unsubscribeFromStore: jest.Mock;
  let notifyStoreChange: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    Platform.OS = 'ios';
    process.env.MM_WIDGETS_ENABLED = 'true';

    activity = {
      update: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
    };
    mockStart.mockReturnValue(activity as never);

    mockFormatBalance.mockReturnValue('$1,234.56');
    mockGetAccountName.mockReturnValue('Account 1');
    mockSelectPrivacyMode.mockReturnValue(false);

    notifyStoreChange = undefined;
    unsubscribeFromStore = jest.fn();
    ReduxService.store = {
      getState: jest.fn(() => ({}) as never),
      dispatch: jest.fn(),
      subscribe: jest.fn((listener: () => void) => {
        notifyStoreChange = listener;
        return unsubscribeFromStore;
      }),
    } as never;

    service = BalanceLiveActivityServiceImplementation.getInstance();
    service.stop();
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.stop();
    jest.useRealTimers();
  });

  describe('support gating', () => {
    it('is unsupported when MM_WIDGETS_ENABLED is not true', () => {
      process.env.MM_WIDGETS_ENABLED = 'false';

      expect(service.isSupported()).toBe(false);
    });

    it('is unsupported on Android, where Live Activities do not exist', () => {
      Platform.OS = 'android';

      expect(service.isSupported()).toBe(false);
    });

    it('does not touch ActivityKit when unsupported', async () => {
      Platform.OS = 'android';

      await expect(service.start()).resolves.toBe(false);

      expect(mockStart).not.toHaveBeenCalled();
      expect(ReduxService.store.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('ends activities orphaned by a previous launch before starting its own', async () => {
      await service.start();

      expect(endLiveActivitiesFromPreviousLaunch).toHaveBeenCalledWith(
        BalanceLiveActivity,
      );
    });

    it('starts an activity with the formatted balance and account name', async () => {
      await expect(service.start()).resolves.toBe(true);

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          accountLabel: 'Account 1',
          label: 'widgets.balance_widget.label',
          balanceDisplay: '$1,234.56',
        }),
      );
    });

    it('passes both theme variants so the layout can follow the OS appearance', async () => {
      await service.start();

      const [props] = mockStart.mock.calls[0];
      expect(props.theme.light.colorScheme).toBe('light');
      expect(props.theme.dark.colorScheme).toBe('dark');
    });

    it('falls back to a generic account label when the group has no name', async () => {
      mockGetAccountName.mockReturnValue(undefined);

      await service.start();

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          accountLabel: 'widgets.balance_live_activity.default_account_label',
        }),
      );
    });

    it('subscribes to the store only once across repeated start calls', async () => {
      await service.start();
      await service.start();

      expect(ReduxService.store.subscribe).toHaveBeenCalledTimes(1);
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it('reports failure when iOS refuses the ActivityKit request', async () => {
      mockStart.mockImplementation(() => {
        throw new Error('Live Activities are disabled');
      });

      await expect(service.start()).resolves.toBe(false);
      expect(service.isRunning()).toBe(true);
    });
  });

  describe('updates', () => {
    it('pushes a debounced update when the balance changes', async () => {
      await service.start();
      mockFormatBalance.mockReturnValue('$2,000.00');

      notifyStoreChange?.();
      jest.advanceTimersByTime(2000);

      expect(activity.update).toHaveBeenCalledWith(
        expect.objectContaining({ balanceDisplay: '$2,000.00' }),
      );
    });

    it('coalesces a burst of store changes into a single write', async () => {
      await service.start();
      mockFormatBalance.mockReturnValue('$2,000.00');

      notifyStoreChange?.();
      notifyStoreChange?.();
      notifyStoreChange?.();
      jest.advanceTimersByTime(2000);

      expect(activity.update).toHaveBeenCalledTimes(1);
    });

    it('skips the write entirely when the computed props are unchanged', async () => {
      await service.start();

      notifyStoreChange?.();
      jest.advanceTimersByTime(2000);

      expect(activity.update).not.toHaveBeenCalled();
    });

    it('retries the start on the next change after iOS refused the first request', async () => {
      mockStart.mockImplementationOnce(() => {
        throw new Error('app is backgrounded');
      });

      await service.start();
      notifyStoreChange?.();
      jest.advanceTimersByTime(2000);

      expect(mockStart).toHaveBeenCalledTimes(2);
    });
  });

  describe('privacy mode', () => {
    it('does not start an activity while privacy mode is on', async () => {
      mockSelectPrivacyMode.mockReturnValue(true);

      await expect(service.start()).resolves.toBe(false);

      expect(mockStart).not.toHaveBeenCalled();
    });

    it('ends a running activity when privacy mode is switched on', async () => {
      await service.start();
      mockSelectPrivacyMode.mockReturnValue(true);

      notifyStoreChange?.();
      jest.advanceTimersByTime(2000);

      expect(activity.end).toHaveBeenCalledWith('immediate');
    });
  });

  describe('stop', () => {
    it('ends the activity and unsubscribes from the store', async () => {
      await service.start();

      service.stop();

      expect(activity.end).toHaveBeenCalledWith('immediate');
      expect(unsubscribeFromStore).toHaveBeenCalledTimes(1);
      expect(service.isRunning()).toBe(false);
    });

    it('drops a pending debounced update so nothing is written after stopping', async () => {
      await service.start();
      mockFormatBalance.mockReturnValue('$2,000.00');
      notifyStoreChange?.();

      service.stop();
      jest.advanceTimersByTime(2000);

      expect(activity.update).not.toHaveBeenCalled();
    });

    it('is safe to call when nothing is running', () => {
      expect(() => service.stop()).not.toThrow();
    });

    it('starts cleanly again after being stopped', async () => {
      await service.start();
      service.stop();

      await expect(service.start()).resolves.toBe(true);
      expect(mockStart).toHaveBeenCalledTimes(2);
    });
  });
});
