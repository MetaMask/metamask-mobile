import {
  ActionListItem,
  BottomSheetDialog,
  BottomSheetHeader,
  Box,
  IconName,
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
import { useSocialProfileId } from '../../../../util/social/useSocialProfileId';
import { useTheme } from '../../../../util/theme';
import { useSocialBlockLists } from '../hooks/useSocialBlockLists';
import {
  type SocialModerationTarget,
  useSocialModerationActions,
} from '../hooks/useSocialModerationActions';
import { SocialEntryReportReason } from '../reportReasons';
import { isViewerSocialAuthor } from '../utils/isViewerSocialAuthor';
import SocialImpersonationSupport from './SocialImpersonationSupport';
import SocialReportReasonPicker from './SocialReportReasonPicker';
import { SocialEntryOptionsBottomSheetSelectorsIDs } from './SocialEntryOptionsBottomSheet.testIds';

export { SocialEntryReportReason };

export type SocialEntryOptionsTarget = SocialModerationTarget;

export interface SocialEntryOptionsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Whether the post can be reported: only a post with a comment can. */
  canReport?: boolean;
  /** Whether the post author can be blocked. */
  canBlockUser?: boolean;
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
> = ({
  onClose,
  onReport,
  onHidePost,
  onBlockUser,
  canReport = true,
  canBlockUser = true,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [step, setStep] = useState<'options' | 'reasons' | 'support'>(
    'options',
  );
  const [selectedReason, setSelectedReason] =
    useState<SocialEntryReportReason | null>(null);

  const handleReport = useCallback(() => {
    setStep('reasons');
  }, []);

  const handleSubmitReport = useCallback(() => {
    if (!selectedReason) {
      return;
    }
    // Impersonation is handled by customer support, not the social API.
    if (selectedReason === SocialEntryReportReason.Impersonation) {
      setStep('support');
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
              step === 'support'
                ? SocialEntryOptionsBottomSheetSelectorsIDs.IMPERSONATION_SUPPORT
                : step === 'reasons'
                  ? SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_REASON_SHEET
                  : SocialEntryOptionsBottomSheetSelectorsIDs.SHEET
            }
          >
            <BottomSheetHeader
              onClose={onClose}
              closeButtonProps={{
                testID:
                  step === 'reasons'
                    ? SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_REASON_CLOSE_BUTTON
                    : SocialEntryOptionsBottomSheetSelectorsIDs.CLOSE_BUTTON,
              }}
            >
              {strings(
                step === 'support'
                  ? 'social_leaderboard.entry_options.impersonation_support_title'
                  : step === 'reasons'
                    ? 'social_leaderboard.entry_options.report_reason_title'
                    : 'social_leaderboard.entry_options.title',
              )}
            </BottomSheetHeader>
            {step === 'support' ? (
              <SocialImpersonationSupport />
            ) : step === 'reasons' ? (
              <SocialReportReasonPicker
                selectedReason={selectedReason}
                onSelectReason={setSelectedReason}
                onSubmit={handleSubmitReport}
              />
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
                {canBlockUser ? (
                  <ActionListItem
                    iconName={IconName.UserCircle}
                    label={strings(
                      'social_leaderboard.entry_options.block_user',
                    )}
                    onPress={handleBlockUser}
                    testID={
                      SocialEntryOptionsBottomSheetSelectorsIDs.BLOCK_USER
                    }
                  />
                ) : null}
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
  const { profileId, isLoading: isViewerProfileLoading } = useSocialProfileId();
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
  const canModerateAuthor = Boolean(
    target &&
      !isViewerProfileLoading &&
      !isViewerSocialAuthor(target.authorId, profileId),
  );
  const value = useMemo(() => ({ open, isEntryHidden }), [isEntryHidden, open]);

  return (
    <SocialEntryOptionsContext.Provider value={value}>
      {children}
      <SocialEntryOptionsBottomSheet
        isOpen={target !== null}
        onClose={onClose}
        canReport={Boolean(target?.commentId) && canModerateAuthor}
        canBlockUser={canModerateAuthor}
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
  const { profileId, isLoading: isViewerProfileLoading } = useSocialProfileId();
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

  const canModerateAuthor =
    !isViewerProfileLoading &&
    !isViewerSocialAuthor(target.authorId, profileId);

  return {
    open: openLocal,
    isHidden: isLocallyHidden,
    sheet: (
      <SocialEntryOptionsBottomSheet
        isOpen={localOpen}
        onClose={closeLocal}
        canReport={Boolean(target.commentId) && canModerateAuthor}
        canBlockUser={canModerateAuthor}
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
