import {
  ActionListItem,
  BottomSheetDialog,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Modal, Platform, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useSocialBlockLists } from '../hooks/useSocialBlockLists';
import {
  type SocialModerationTarget,
  useSocialModerationActions,
} from '../hooks/useSocialModerationActions';
import {
  getSocialEntryReportReasonTestId,
  SocialEntryOptionsBottomSheetSelectorsIDs,
} from './SocialEntryOptionsBottomSheet.testIds';

export enum SocialEntryReportReason {
  Spam = 'spam',
  Harassment = 'harassment',
  Misleading = 'misleading',
  Other = 'other',
}

const REPORT_REASONS = [
  SocialEntryReportReason.Spam,
  SocialEntryReportReason.Harassment,
  SocialEntryReportReason.Misleading,
  SocialEntryReportReason.Other,
] as const;

export type SocialEntryOptionsTarget = SocialModerationTarget;

export interface SocialEntryOptionsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Whether the post can be reported: only a post with a comment can. */
  canReport?: boolean;
  onReport?: (reason: SocialEntryReportReason) => void;
  onHidePost?: () => void;
  onBlockUser?: () => void;
}

interface SocialEntryOptionsContextValue {
  open: (target: SocialEntryOptionsTarget) => void;
  isEntryHidden: (target: SocialEntryOptionsTarget) => boolean;
}

const SocialEntryOptionsContext =
  createContext<SocialEntryOptionsContextValue | null>(null);

/**
 * The post options sheet: report, hide the post, or block its author.
 */
const SocialEntryOptionsBottomSheetInner: React.FC<
  Omit<SocialEntryOptionsBottomSheetProps, 'isOpen'>
> = ({ onClose, onReport, onHidePost, onBlockUser, canReport = true }) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [showReportReasons, setShowReportReasons] = useState(false);
  const [selectedReason, setSelectedReason] =
    useState<SocialEntryReportReason | null>(null);

  const handleReport = useCallback(() => {
    setShowReportReasons(true);
  }, []);

  const handleSubmitReport = useCallback(() => {
    if (!selectedReason) {
      return;
    }
    onReport?.(selectedReason);
    onClose();
  }, [onClose, onReport, selectedReason]);

  const handleHidePost = useCallback(() => {
    onHidePost?.();
    onClose();
  }, [onClose, onHidePost]);

  const handleBlockUser = useCallback(() => {
    onBlockUser?.();
    onClose();
  }, [onBlockUser, onClose]);

  const overlay = (
    <SafeAreaProvider>
      <GestureHandlerRootView style={tw.style('flex-1')}>
        <Box twClassName="absolute inset-0">
          <Pressable
            style={tw.style('absolute inset-0', {
              backgroundColor: colors.overlay.default,
            })}
            onPress={onClose}
            accessibilityRole="button"
            testID={SocialEntryOptionsBottomSheetSelectorsIDs.BACKDROP}
          />
          <BottomSheetDialog
            onClose={onClose}
            testID={
              showReportReasons
                ? SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_REASON_SHEET
                : SocialEntryOptionsBottomSheetSelectorsIDs.SHEET
            }
          >
            <BottomSheetHeader
              onClose={onClose}
              closeButtonProps={{
                testID: showReportReasons
                  ? SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_REASON_CLOSE_BUTTON
                  : SocialEntryOptionsBottomSheetSelectorsIDs.CLOSE_BUTTON,
              }}
            >
              {strings(
                showReportReasons
                  ? 'social_leaderboard.entry_options.report_reason_title'
                  : 'social_leaderboard.entry_options.title',
              )}
            </BottomSheetHeader>
            {showReportReasons ? (
              <Box twClassName="px-4 pb-10">
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  twClassName="mb-4"
                >
                  {strings(
                    'social_leaderboard.entry_options.report_reason_description',
                  )}
                </Text>
                <Box gap={4}>
                  {REPORT_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <Pressable
                        key={reason}
                        onPress={() => setSelectedReason(reason)}
                        style={({ pressed }) =>
                          tw.style(pressed && 'opacity-70')
                        }
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        testID={getSocialEntryReportReasonTestId(reason)}
                      >
                        <Box
                          flexDirection={BoxFlexDirection.Row}
                          alignItems={BoxAlignItems.Center}
                          gap={3}
                          twClassName="py-1"
                        >
                          <Box
                            twClassName={`h-6 w-6 rounded-full border ${
                              isSelected
                                ? 'border-primary-default'
                                : 'border-muted'
                            }`}
                            alignItems={BoxAlignItems.Center}
                            justifyContent={BoxJustifyContent.Center}
                          >
                            {isSelected ? (
                              <Box twClassName="h-3 w-3 rounded-full bg-primary-default" />
                            ) : null}
                          </Box>
                          <Text
                            variant={TextVariant.BodyMd}
                            fontWeight={FontWeight.Regular}
                          >
                            {strings(
                              `social_leaderboard.entry_options.report_reasons.${reason}`,
                            )}
                          </Text>
                        </Box>
                      </Pressable>
                    );
                  })}
                </Box>
                <Box twClassName="mt-6">
                  <Button
                    variant={ButtonVariant.Primary}
                    size={ButtonSize.Lg}
                    isFullWidth
                    isDisabled={selectedReason === null}
                    onPress={handleSubmitReport}
                    testID={
                      SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT
                    }
                  >
                    {strings('social_leaderboard.entry_options.submit_report')}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box twClassName="pb-4">
                {canReport ? (
                  <ActionListItem
                    iconName={IconName.Flag}
                    label={strings('social_leaderboard.entry_options.report')}
                    onPress={handleReport}
                    testID={SocialEntryOptionsBottomSheetSelectorsIDs.REPORT}
                  />
                ) : null}
                <ActionListItem
                  iconName={IconName.EyeSlash}
                  label={strings('social_leaderboard.entry_options.hide_post')}
                  onPress={handleHidePost}
                  testID={SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST}
                />
                <ActionListItem
                  iconName={IconName.UserCircle}
                  label={strings('social_leaderboard.entry_options.block_user')}
                  onPress={handleBlockUser}
                  testID={SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER}
                />
              </Box>
            )}
          </BottomSheetDialog>
        </Box>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );

  // iOS PagerView page 0 (Trending) cannot present an RN Modal — even when
  // the Modal is hosted outside the pager. FullWindowOverlay opens a new
  // UIWindow instead (same as HardwareWalletProvider / ToasterOverlay).
  // Nested Modals cannot present from that window, so iOS skips Modal.
  // Android FullWindowOverlay is a plain View and would break layout.
  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{overlay}</FullWindowOverlay>;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      {overlay}
    </Modal>
  );
};

const SocialEntryOptionsBottomSheet: React.FC<
  SocialEntryOptionsBottomSheetProps
> = ({ isOpen, ...innerProps }) => {
  if (!isOpen) {
    return null;
  }

  return <SocialEntryOptionsBottomSheetInner {...innerProps} />;
};

const withId = (ids: Set<string>, id: string) => new Set(ids).add(id);

const withoutId = (ids: Set<string>, id: string) => {
  const next = new Set(ids);
  next.delete(id);
  return next;
};

const SocialEntryOptionsHost: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { hidePost, blockUser, report } = useSocialModerationActions();
  const { blockedProfileIds, blockedCommentIds } = useSocialBlockLists();
  const [target, setTarget] = useState<SocialEntryOptionsTarget | null>(null);
  // Hidden at once on the viewer's action, before the block lists refetch.
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [blockedAuthorIds, setBlockedAuthorIds] = useState<Set<string>>(
    () => new Set(),
  );
  const open = useCallback((nextTarget: SocialEntryOptionsTarget) => {
    setTarget(nextTarget);
  }, []);
  const onClose = useCallback(() => setTarget(null), []);
  const isEntryHidden = useCallback(
    (entry: SocialEntryOptionsTarget) =>
      hiddenPostIds.has(entry.postId) ||
      blockedAuthorIds.has(entry.authorId) ||
      blockedProfileIds.has(entry.authorId) ||
      (entry.commentId !== undefined && blockedCommentIds.has(entry.commentId)),
    [blockedAuthorIds, blockedCommentIds, blockedProfileIds, hiddenPostIds],
  );
  const hidePostLocally = useCallback(
    (postId: string) => ({
      apply: () => setHiddenPostIds((current) => withId(current, postId)),
      revert: () => setHiddenPostIds((current) => withoutId(current, postId)),
    }),
    [],
  );
  const handleHidePost = useCallback(() => {
    if (target) {
      hidePost(target, hidePostLocally(target.postId));
    }
  }, [hidePost, hidePostLocally, target]);
  const handleBlockUser = useCallback(() => {
    if (target) {
      blockUser(target, {
        apply: () =>
          setBlockedAuthorIds((current) => withId(current, target.authorId)),
        revert: () =>
          setBlockedAuthorIds((current) => withoutId(current, target.authorId)),
      });
    }
  }, [blockUser, target]);
  const handleReport = useCallback(
    (reason: SocialEntryReportReason) => {
      if (target) {
        report(target, reason, hidePostLocally(target.postId));
      }
    },
    [hidePostLocally, report, target],
  );
  const value = useMemo(() => ({ open, isEntryHidden }), [isEntryHidden, open]);

  return (
    <SocialEntryOptionsContext.Provider value={value}>
      {children}
      <SocialEntryOptionsBottomSheet
        isOpen={target !== null}
        onClose={onClose}
        canReport={Boolean(target?.commentId)}
        onHidePost={handleHidePost}
        onBlockUser={handleBlockUser}
        onReport={handleReport}
      />
    </SocialEntryOptionsContext.Provider>
  );
};

/**
 * Hosts the options sheet outside `PagerView`. On iOS this is a
 * FullWindowOverlay (PagerView page 0 cannot present RN Modal); on Android
 * it remains a Modal.
 *
 * Nested providers reuse the outermost one, so a feed embedded in a screen
 * that already hosts the sheet shares its hidden posts and blocked authors
 * instead of opening a second sheet.
 */
export const SocialEntryOptionsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const outer = useContext(SocialEntryOptionsContext);
  if (outer) {
    return <>{children}</>;
  }
  return <SocialEntryOptionsHost>{children}</SocialEntryOptionsHost>;
};

/**
 * Opens the moderation sheet. When a {@link SocialEntryOptionsProvider} is
 * mounted, the Modal is hosted there; otherwise the caller must render
 * `sheet` so unit tests and standalone rows still work.
 */
export const useSocialEntryOptions = (
  target: SocialEntryOptionsTarget,
): {
  open: () => void;
  sheet: React.ReactNode;
  isHidden: boolean;
} => {
  const hosted = useContext(SocialEntryOptionsContext);
  const { hidePost, blockUser, report } = useSocialModerationActions();
  const [localOpen, setLocalOpen] = useState(false);
  const [isLocallyHidden, setIsLocallyHidden] = useState(false);
  const openLocal = useCallback(() => setLocalOpen(true), []);
  const closeLocal = useCallback(() => setLocalOpen(false), []);
  const hideLocally = useMemo(
    () => ({
      apply: () => setIsLocallyHidden(true),
      revert: () => setIsLocallyHidden(false),
    }),
    [],
  );

  if (hosted) {
    return {
      open: () => hosted.open(target),
      sheet: null,
      isHidden: hosted.isEntryHidden(target),
    };
  }

  return {
    open: openLocal,
    isHidden: isLocallyHidden,
    sheet: (
      <SocialEntryOptionsBottomSheet
        isOpen={localOpen}
        onClose={closeLocal}
        canReport={Boolean(target.commentId)}
        onHidePost={() => hidePost(target, hideLocally)}
        onBlockUser={() => blockUser(target, hideLocally)}
        onReport={(reason) => report(target, reason, hideLocally)}
      />
    ),
  };
};

/**
 * Whether a post is hidden for the viewer: by their own action this session,
 * or by their block lists. Reads them from the {@link SocialEntryOptionsProvider}
 * every feed is mounted under; without one nothing is hidden.
 */
export const useSocialEntryModeration = () => {
  const hosted = useContext(SocialEntryOptionsContext);
  return {
    isEntryHidden: hosted?.isEntryHidden ?? (() => false satisfies boolean),
  };
};

export default SocialEntryOptionsBottomSheet;
