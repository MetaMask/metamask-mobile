import React, { useRef, useCallback } from 'react';
import { View, Text as RNText } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import createStyles from './ExistingUserSheet.styles';
import { ExistingUserSheetSelectorsIDs } from './ExistingUserSheet.testIds';
import { useTheme } from '../../../../../util/theme';

export interface ExistingUserSheetProps {
  isVisible: boolean;
  onClose: (hasPendingAction?: boolean) => void;
  onConfirm?: () => void;
  onNotNow?: () => void;
  testID?: string;
}

const ExistingUserSheet: React.FC<ExistingUserSheetProps> = ({
  isVisible,
  onClose,
  onConfirm,
  onNotNow,
  testID,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const closeWithAction = useCallback((action?: () => void) => {
    const callback = () => action?.();
    if (!bottomSheetRef.current) {
      callback();
      return;
    }
    bottomSheetRef.current.onCloseBottomSheet(callback);
  }, []);

  const handleConfirm = useCallback(() => {
    closeWithAction(onConfirm);
  }, [closeWithAction, onConfirm]);

  const handleNotNow = useCallback(() => {
    closeWithAction(onNotNow);
  }, [closeWithAction, onNotNow]);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      testID={testID ?? ExistingUserSheetSelectorsIDs.CONTAINER}
    >
      <View style={styles.container}>
        <RNText
          style={styles.title}
          testID={ExistingUserSheetSelectorsIDs.TITLE}
        >
          {strings('notifications.push_onboarding.existing_user.title')}
        </RNText>

        <RNText style={styles.body} testID={ExistingUserSheetSelectorsIDs.BODY}>
          {strings('notifications.push_onboarding.existing_user.body')}
        </RNText>

        <View
          style={styles.consentCard}
          testID={ExistingUserSheetSelectorsIDs.CONSENT_CARD}
        >
          <RNText style={styles.consentCardTitle}>
            {strings('notifications.push_onboarding.existing_user.card_title')}
          </RNText>
          <RNText style={styles.consentCardDescription}>
            {strings(
              'notifications.push_onboarding.existing_user.card_description',
            )}
          </RNText>
        </View>

        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleConfirm}
            style={styles.button}
            testID={ExistingUserSheetSelectorsIDs.BUTTON_CONFIRM}
          >
            {strings(
              'notifications.push_onboarding.existing_user.button_confirm',
            )}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleNotNow}
            style={styles.button}
            testID={ExistingUserSheetSelectorsIDs.BUTTON_NOT_NOW}
          >
            {strings(
              'notifications.push_onboarding.existing_user.button_not_now',
            )}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default ExistingUserSheet;
