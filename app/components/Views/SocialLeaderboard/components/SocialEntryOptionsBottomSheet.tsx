import {
  ActionListItem,
  BottomSheetDialog,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  IconName,
  RadioButton,
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
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { useTheme } from '../../../../util/theme';
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

export interface SocialEntryOptionsTarget {
  postId: string;
  authorId: string;
  authorHandle: string;
}

export interface SocialEntryOptionsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
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
 * Mocked moderation menu for Social V1. Actions only update in-memory UI state
 * until the social API supports reporting, hiding, and blocking.
 */
const SocialEntryOptionsBottomSheetInner: React.FC<
  Omit<SocialEntryOptionsBottomSheetProps, 'isOpen'>
> = ({ onClose, onReport, onHidePost, onBlockUser }) => {
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
              <>
                <Box twClassName="px-4 pb-2">
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {strings(
                      'social_leaderboard.entry_options.report_reason_description',
                    )}
                  </Text>
                </Box>
                <Box twClassName="pb-2">
                  {REPORT_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <ActionListItem
                        key={reason}
                        label={strings(
                          `social_leaderboard.entry_options.report_reasons.${reason}`,
                        )}
                        onPress={() => setSelectedReason(reason)}
                        endAccessory={
                          <RadioButton
                            isChecked={isSelected}
                            isReadOnly
                            accessibilityElementsHidden
                          />
                        }
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        testID={getSocialEntryReportReasonTestId(reason)}
                      />
                    );
                  })}
                </Box>
                <BottomSheetFooter
                  primaryButtonProps={{
                    children: strings(
                      'social_leaderboard.entry_options.submit_report',
                    ),
                    onPress: handleSubmitReport,
                    isDisabled: selectedReason === null,
                    testID:
                      SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT,
                  }}
                />
              </>
            ) : (
              <Box twClassName="pb-4">
                <ActionListItem
                  iconName={IconName.Flag}
                  label={strings('social_leaderboard.entry_options.report')}
                  onPress={handleReport}
                  testID={SocialEntryOptionsBottomSheetSelectorsIDs.REPORT}
                />
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

/**
 * Hosts the options sheet outside `PagerView`. On iOS this is a
 * FullWindowOverlay (PagerView page 0 cannot present RN Modal); on Android
 * it remains a Modal.
 */
export const SocialEntryOptionsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { toastRef } = useContext(ToastContext);
  const [target, setTarget] = useState<SocialEntryOptionsTarget | null>(null);
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
      hiddenPostIds.has(entry.postId) || blockedAuthorIds.has(entry.authorId),
    [blockedAuthorIds, hiddenPostIds],
  );
  const showConfirmation = useCallback(
    (message: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [{ label: message, isBold: true }],
        hasNoTimeout: false,
      });
    },
    [toastRef],
  );
  const handleHidePost = useCallback(() => {
    if (!target) {
      return;
    }
    setHiddenPostIds((current) => new Set(current).add(target.postId));
    showConfirmation(
      strings('social_leaderboard.entry_options.post_hidden_confirmation'),
    );
  }, [showConfirmation, target]);
  const handleBlockUser = useCallback(() => {
    if (!target) {
      return;
    }
    setBlockedAuthorIds((current) => new Set(current).add(target.authorId));
    showConfirmation(
      strings('social_leaderboard.entry_options.user_blocked_confirmation', {
        username: target.authorHandle,
      }),
    );
  }, [showConfirmation, target]);
  const handleReport = useCallback(() => {
    showConfirmation(
      strings('social_leaderboard.entry_options.report_confirmation'),
    );
  }, [showConfirmation]);
  const value = useMemo(() => ({ open, isEntryHidden }), [isEntryHidden, open]);

  return (
    <SocialEntryOptionsContext.Provider value={value}>
      {children}
      <SocialEntryOptionsBottomSheet
        isOpen={target !== null}
        onClose={onClose}
        onHidePost={handleHidePost}
        onBlockUser={handleBlockUser}
        onReport={handleReport}
      />
    </SocialEntryOptionsContext.Provider>
  );
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
  const [localOpen, setLocalOpen] = useState(false);
  const [isLocallyHidden, setIsLocallyHidden] = useState(false);
  const openLocal = useCallback(() => setLocalOpen(true), []);
  const closeLocal = useCallback(() => setLocalOpen(false), []);
  const hideLocal = useCallback(() => setIsLocallyHidden(true), []);

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
        onHidePost={hideLocal}
        onBlockUser={hideLocal}
      />
    ),
  };
};

export const useSocialEntryModeration = () => {
  const hosted = useContext(SocialEntryOptionsContext);
  return {
    isEntryHidden: hosted?.isEntryHidden ?? (() => false satisfies boolean),
  };
};

export default SocialEntryOptionsBottomSheet;
