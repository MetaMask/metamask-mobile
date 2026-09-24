import {
  ActionListItem,
  BottomSheetDialog,
  BottomSheetHeader,
  Box,
  IconName,
} from '@metamask/design-system-react-native';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { SocialEntryOptionsBottomSheetSelectorsIDs } from './SocialEntryOptionsBottomSheet.testIds';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export interface SocialEntryOptionsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional hook for a future report flow. Defaults to closing the sheet. */
  onReport?: () => void;
}

interface SocialEntryOptionsContextValue {
  open: () => void;
}

const SocialEntryOptionsContext =
  createContext<SocialEntryOptionsContextValue | null>(null);

/**
 * Overflow sheet for Social V1 posts and rows. Report is a no-op besides
 * dismissing the sheet until the report pipeline lands.
 */
const SocialEntryOptionsBottomSheetInner: React.FC<
  Omit<SocialEntryOptionsBottomSheetProps, 'isOpen'>
> = ({ onClose, onReport }) => {
  const { colors } = useTheme();

  const handleReport = useCallback(() => {
    onReport?.();
    onClose();
  }, [onClose, onReport]);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <Box twClassName="absolute inset-0">
            <Pressable
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.overlay.default },
              ]}
              onPress={onClose}
              accessibilityRole="button"
              testID={SocialEntryOptionsBottomSheetSelectorsIDs.BACKDROP}
            />
            <BottomSheetDialog
              onClose={onClose}
              testID={SocialEntryOptionsBottomSheetSelectorsIDs.SHEET}
            >
              <BottomSheetHeader
                onClose={onClose}
                closeButtonProps={{
                  testID:
                    SocialEntryOptionsBottomSheetSelectorsIDs.CLOSE_BUTTON,
                }}
              >
                {strings('social_leaderboard.entry_options.title')}
              </BottomSheetHeader>
              <Box twClassName="pb-4">
                <ActionListItem
                  iconName={IconName.Flag}
                  label={strings('social_leaderboard.entry_options.report')}
                  onPress={handleReport}
                  testID={SocialEntryOptionsBottomSheetSelectorsIDs.REPORT}
                />
              </Box>
            </BottomSheetDialog>
          </Box>
        </GestureHandlerRootView>
      </SafeAreaProvider>
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
 * Hosts the options Modal outside `PagerView`. iOS often fails to present a
 * Modal from pager page 0 (Trending), while later tabs work.
 */
export const SocialEntryOptionsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <SocialEntryOptionsContext.Provider value={value}>
      {children}
      <SocialEntryOptionsBottomSheet isOpen={isOpen} onClose={onClose} />
    </SocialEntryOptionsContext.Provider>
  );
};

/**
 * Opens the Report sheet. When a {@link SocialEntryOptionsProvider} is
 * mounted, the Modal is hosted there; otherwise the caller must render
 * `sheet` so unit tests and standalone rows still work.
 */
export const useSocialEntryOptions = (): {
  open: () => void;
  sheet: React.ReactNode;
} => {
  const hosted = useContext(SocialEntryOptionsContext);
  const [localOpen, setLocalOpen] = useState(false);
  const openLocal = useCallback(() => setLocalOpen(true), []);
  const closeLocal = useCallback(() => setLocalOpen(false), []);

  if (hosted) {
    return { open: hosted.open, sheet: null };
  }

  return {
    open: openLocal,
    sheet: (
      <SocialEntryOptionsBottomSheet isOpen={localOpen} onClose={closeLocal} />
    ),
  };
};

export default SocialEntryOptionsBottomSheet;
