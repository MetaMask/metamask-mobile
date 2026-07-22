import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';

export interface StandaloneSupportConsentModalProps {
  visible: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onDismiss: () => void;
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.overlay.default,
    },
    sheet: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      rowGap: 16,
    },
    buttonsRow: {
      flexDirection: 'row',
      columnGap: 16,
    },
    button: {
      flex: 1,
    },
  });

/**
 * Navigation-free counterpart to `SupportConsentSheet`, for entry points that
 * cannot rely on `NavigationContainer` being mounted (e.g. the root
 * `ErrorBoundary`, which wraps `NavigationProvider` and so is never given a
 * `navigation` prop). Renders crash-safe without an ancestor theme context:
 * `useTheme()` falls back to `mockTheme` for the overlay/sheet colors, and the
 * `@metamask/design-system-react-native` primitives fall back to the default
 * (Light theme) Tailwind context when no `ThemeProvider` is mounted, matching
 * the rest of `ErrorBoundary`'s crash-safe rendering.
 */
const StandaloneSupportConsentModal = ({
  visible,
  onConfirm,
  onReject,
  onDismiss,
}: StandaloneSupportConsentModalProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      testID="standalone-support-consent-modal"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
            {strings('support_consent.title')}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {strings('support_consent.description')}
          </Text>
          <View style={styles.buttonsRow}>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onReject}
              style={styles.button}
              testID="standalone-support-consent-reject-button"
            >
              {strings('support_consent.reject')}
            </Button>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onConfirm}
              style={styles.button}
              testID="standalone-support-consent-confirm-button"
            >
              {strings('support_consent.confirm')}
            </Button>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default StandaloneSupportConsentModal;
