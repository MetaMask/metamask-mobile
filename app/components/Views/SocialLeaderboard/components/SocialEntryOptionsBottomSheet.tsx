import {
  ActionListItem,
  BottomSheetDialog,
  BottomSheetHeader,
  Box,
  IconName,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
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

export default SocialEntryOptionsBottomSheet;
