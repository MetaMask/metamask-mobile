import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
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
 * `navigation` prop). Uses the legacy `component-library` primitives (rather
 * than `@metamask/design-system-react-native`, which `SupportConsentSheet`
 * uses) because `useTheme()` and these primitives already fall back to
 * `mockTheme` with no `ThemeProvider` present, matching the rest of
 * `ErrorBoundary`'s crash-safe rendering.
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
          <Text variant={TextVariant.HeadingSM} color={colors.text.default}>
            {strings('support_consent.title')}
          </Text>
          <Text variant={TextVariant.BodyMD} color={colors.text.default}>
            {strings('support_consent.description')}
          </Text>
          <View style={styles.buttonsRow}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('support_consent.reject')}
              onPress={onReject}
              style={styles.button}
              testID="standalone-support-consent-reject-button"
            />
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('support_consent.confirm')}
              onPress={onConfirm}
              style={styles.button}
              testID="standalone-support-consent-confirm-button"
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default StandaloneSupportConsentModal;
