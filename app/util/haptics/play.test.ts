import {
  impactAsync,
  notificationAsync,
  selectionAsync,
  NotificationFeedbackType,
  ImpactFeedbackStyle,
} from 'expo-haptics';
import {
  playSuccessNotification,
  playErrorNotification,
  playWarningNotification,
  playImpact,
  playSelection,
} from './play';
import { ImpactMoment } from './catalog';
import { shouldPlayHaptic } from './gates';

jest.mock('./gates', () => ({
  ...jest.requireActual<typeof import('./gates')>('./gates'),
  shouldPlayHaptic: jest.fn(),
}));

jest.mock('../../core/redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(() => ({
        settings: { hapticsEnabled: true },
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              localOverrides: {},
            },
          },
        },
      })),
    },
  },
}));

const mockShouldPlayHaptic = shouldPlayHaptic as jest.MockedFunction<
  typeof shouldPlayHaptic
>;

describe('play.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when gates allow playback', () => {
    beforeEach(() => {
      mockShouldPlayHaptic.mockReturnValue(true);
    });

    it('playSuccessNotification calls notificationAsync with Success', async () => {
      await playSuccessNotification();
      expect(notificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Success,
      );
    });

    it('playErrorNotification calls notificationAsync with Error', async () => {
      await playErrorNotification();
      expect(notificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Error,
      );
    });

    it('playWarningNotification calls notificationAsync with Warning', async () => {
      await playWarningNotification();
      expect(notificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Warning,
      );
    });

    it('playImpact(SliderTick) calls impactAsync with Light', async () => {
      await playImpact(ImpactMoment.SliderTick);
      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    });

    it('playImpact(QuickAmountSelection) calls impactAsync with Light', async () => {
      await playImpact(ImpactMoment.QuickAmountSelection);
      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    });

    it('playImpact(SliderGrip) calls impactAsync with Medium', async () => {
      await playImpact(ImpactMoment.SliderGrip);
      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
    });

    it('playImpact(TabChange) calls impactAsync with Medium', async () => {
      await playImpact(ImpactMoment.TabChange);
      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
    });

    it('playImpact(PullToRefreshEngage) calls impactAsync with Light', async () => {
      await playImpact(ImpactMoment.PullToRefreshEngage);
      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    });

    it('playImpact(PullToRefresh) calls impactAsync with Medium', async () => {
      await playImpact(ImpactMoment.PullToRefresh);
      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
    });

    it('playImpact(ChartCrosshair) calls impactAsync with Light', async () => {
      await playImpact(ImpactMoment.ChartCrosshair);
      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    });

    it('playSelection calls selectionAsync', async () => {
      await playSelection();
      expect(selectionAsync).toHaveBeenCalled();
    });
  });

  describe('when gates block playback', () => {
    beforeEach(() => {
      mockShouldPlayHaptic.mockReturnValue(false);
    });

    it('playSuccessNotification does not call vendor', async () => {
      await playSuccessNotification();
      expect(notificationAsync).not.toHaveBeenCalled();
    });

    it('playErrorNotification does not call vendor', async () => {
      await playErrorNotification();
      expect(notificationAsync).not.toHaveBeenCalled();
    });

    it('playWarningNotification does not call vendor', async () => {
      await playWarningNotification();
      expect(notificationAsync).not.toHaveBeenCalled();
    });

    it('playImpact does not call vendor', async () => {
      await playImpact(ImpactMoment.SliderTick);
      expect(impactAsync).not.toHaveBeenCalled();
    });

    it('playSelection does not call vendor', async () => {
      await playSelection();
      expect(selectionAsync).not.toHaveBeenCalled();
    });
  });

  describe('error resilience', () => {
    beforeEach(() => {
      mockShouldPlayHaptic.mockReturnValue(true);
    });

    it('playSuccessNotification resolves when vendor throws', async () => {
      (notificationAsync as jest.Mock).mockRejectedValueOnce(
        new Error('native crash'),
      );
      await expect(playSuccessNotification()).resolves.toBeUndefined();
    });

    it('playImpact resolves when vendor throws', async () => {
      (impactAsync as jest.Mock).mockRejectedValueOnce(
        new Error('native crash'),
      );
      await expect(playImpact(ImpactMoment.TabChange)).resolves.toBeUndefined();
    });

    it('playSelection resolves when vendor throws', async () => {
      (selectionAsync as jest.Mock).mockRejectedValueOnce(
        new Error('native crash'),
      );
      await expect(playSelection()).resolves.toBeUndefined();
    });
  });
});
