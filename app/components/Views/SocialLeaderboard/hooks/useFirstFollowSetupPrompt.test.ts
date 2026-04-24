import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useFirstFollowSetupPrompt } from './useFirstFollowSetupPrompt';
import type { TopTradersNotificationsSetupBottomSheetRef } from '../TraderProfileView/components/TopTradersNotificationsSetupBottomSheet';
import type { SocialAIPreference } from '../NotificationPreferencesView/hooks';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/socialController', () => ({
  selectFollowingProfileIds: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const makePreferences = (
  overrides: Partial<SocialAIPreference> = {},
): SocialAIPreference => ({
  enabled: false,
  txAmountLimit: 500,
  mutedTraderProfileIds: [],
  ...overrides,
});

const makeSheetRef = () => {
  const onOpenBottomSheet = jest.fn();
  const onCloseBottomSheet = jest.fn();
  const ref = {
    current: {
      onOpenBottomSheet,
      onCloseBottomSheet,
    } as TopTradersNotificationsSetupBottomSheetRef,
  };
  return { ref, onOpenBottomSheet };
};

interface HookProps {
  followingIds: string[];
  preferences: SocialAIPreference;
  isLoadingPreferences: boolean;
}

const renderTestHook = (
  props: HookProps,
  sheetRef: React.RefObject<TopTradersNotificationsSetupBottomSheetRef>,
) => {
  mockUseSelector.mockReturnValue(props.followingIds);
  return renderHook(
    ({ preferences, isLoadingPreferences }: Omit<HookProps, 'followingIds'>) =>
      useFirstFollowSetupPrompt({
        sheetRef,
        preferences,
        isLoadingPreferences,
      }),
    {
      initialProps: {
        preferences: props.preferences,
        isLoadingPreferences: props.isLoadingPreferences,
      },
    },
  );
};

describe('useFirstFollowSetupPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when followingProfileIds transitions from 0 to 1', () => {
    it('opens the setup sheet when notifications are not enabled and not loading', () => {
      const { ref, onOpenBottomSheet } = makeSheetRef();

      mockUseSelector.mockReturnValue([]);
      const { rerender } = renderHook(
        ({ followingIds }: { followingIds: string[] }) => {
          mockUseSelector.mockReturnValue(followingIds);
          return useFirstFollowSetupPrompt({
            sheetRef: ref,
            preferences: makePreferences({ enabled: false }),
            isLoadingPreferences: false,
          });
        },
        { initialProps: { followingIds: [] as string[] } },
      );

      act(() => {
        rerender({ followingIds: ['trader-1'] });
      });

      expect(onOpenBottomSheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('when followingProfileIds transitions from 1 to 2', () => {
    it('does not open the setup sheet', () => {
      const { ref, onOpenBottomSheet } = makeSheetRef();

      const { rerender } = renderHook(
        ({ followingIds }: { followingIds: string[] }) => {
          mockUseSelector.mockReturnValue(followingIds);
          return useFirstFollowSetupPrompt({
            sheetRef: ref,
            preferences: makePreferences({ enabled: false }),
            isLoadingPreferences: false,
          });
        },
        { initialProps: { followingIds: ['trader-1'] } },
      );

      act(() => {
        rerender({ followingIds: ['trader-1', 'trader-2'] });
      });

      expect(onOpenBottomSheet).not.toHaveBeenCalled();
    });
  });

  describe('when followingProfileIds transitions from 1 to 0 (unfollow)', () => {
    it('does not open the setup sheet', () => {
      const { ref, onOpenBottomSheet } = makeSheetRef();

      const { rerender } = renderHook(
        ({ followingIds }: { followingIds: string[] }) => {
          mockUseSelector.mockReturnValue(followingIds);
          return useFirstFollowSetupPrompt({
            sheetRef: ref,
            preferences: makePreferences({ enabled: false }),
            isLoadingPreferences: false,
          });
        },
        { initialProps: { followingIds: ['trader-1'] } },
      );

      act(() => {
        rerender({ followingIds: [] });
      });

      expect(onOpenBottomSheet).not.toHaveBeenCalled();
    });
  });

  describe('when preferences are still loading', () => {
    it('does not open the setup sheet even when followingProfileIds transitions from 0 to 1', () => {
      const { ref, onOpenBottomSheet } = makeSheetRef();

      const { rerender } = renderHook(
        ({
          followingIds,
          isLoadingPreferences,
        }: {
          followingIds: string[];
          isLoadingPreferences: boolean;
        }) => {
          mockUseSelector.mockReturnValue(followingIds);
          return useFirstFollowSetupPrompt({
            sheetRef: ref,
            preferences: makePreferences({ enabled: false }),
            isLoadingPreferences,
          });
        },
        {
          initialProps: {
            followingIds: [] as string[],
            isLoadingPreferences: true,
          },
        },
      );

      act(() => {
        rerender({ followingIds: ['trader-1'], isLoadingPreferences: true });
      });

      expect(onOpenBottomSheet).not.toHaveBeenCalled();
    });
  });

  describe('when notifications are already enabled', () => {
    it('does not open the setup sheet when followingProfileIds transitions from 0 to 1', () => {
      const { ref, onOpenBottomSheet } = makeSheetRef();

      const { rerender } = renderHook(
        ({ followingIds }: { followingIds: string[] }) => {
          mockUseSelector.mockReturnValue(followingIds);
          return useFirstFollowSetupPrompt({
            sheetRef: ref,
            preferences: makePreferences({ enabled: true }),
            isLoadingPreferences: false,
          });
        },
        { initialProps: { followingIds: [] as string[] } },
      );

      act(() => {
        rerender({ followingIds: ['trader-1'] });
      });

      expect(onOpenBottomSheet).not.toHaveBeenCalled();
    });
  });

  describe('on initial mount with already-followed traders', () => {
    it('does not open the setup sheet when starting with non-zero followingProfileIds', () => {
      const { ref, onOpenBottomSheet } = makeSheetRef();

      mockUseSelector.mockReturnValue(['trader-1', 'trader-2', 'trader-3']);
      renderHook(() =>
        useFirstFollowSetupPrompt({
          sheetRef: ref,
          preferences: makePreferences({ enabled: false }),
          isLoadingPreferences: false,
        }),
      );

      expect(onOpenBottomSheet).not.toHaveBeenCalled();
    });
  });

  describe('when sheet ref is not yet attached', () => {
    it('does not throw when ref.current is null and followingProfileIds transitions from 0 to 1', () => {
      const ref = {
        current: null,
      } as React.RefObject<TopTradersNotificationsSetupBottomSheetRef>;

      expect(() => {
        const { rerender } = renderHook(
          ({ followingIds }: { followingIds: string[] }) => {
            mockUseSelector.mockReturnValue(followingIds);
            return useFirstFollowSetupPrompt({
              sheetRef: ref,
              preferences: makePreferences({ enabled: false }),
              isLoadingPreferences: false,
            });
          },
          { initialProps: { followingIds: [] as string[] } },
        );

        act(() => {
          rerender({ followingIds: ['trader-1'] });
        });
      }).not.toThrow();
    });
  });
});
