// Third party dependencies.
import React, { useRef } from 'react';
import { View } from 'react-native';

// External dependencies.
import { useMetrics } from '../../../hooks/useMetrics';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../component-library/components/Checkbox/Checkbox';
import createStyles from '../../ProfileSyncing/ProfileSyncingModal/ProfileSyncingModal.styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { MetaMetricsEvents } from '../../../../core/Analytics';

const ResetNotificationsModal = () => {
  const { trackEvent } = useMetrics();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isChecked, setIsChecked] = React.useState(false);

  // TODO: Handle errror/loading states from enabling/disabling profile syncing
  const closeBottomSheet = () => {
    bottomSheetRef.current?.onCloseBottomSheet(async () => {
      trackEvent(MetaMetricsEvents.NOTIFICATION_STORAGE_KEY_DELETED, {
        settings_type: 'reset_notifications_storage_key',
      });
    });
  };

  const handleSwitchToggle = () => {
    closeBottomSheet();
  };

  const handleCancel = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  const resetNotificationsStoreKey = () => (
    <View style={styles.container}>
      <Icon
        name={IconName.Danger}
        color={IconColor.Error}
        size={IconSize.Xl}
        style={styles.icon}
      />
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('app_settings.reset_notifications_title')}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.description}>
        {strings('app_settings.reset_notifications_description')}
      </Text>
      <View style={styles.bottom}>
          <Checkbox
            label={strings('default_settings.sheet.checkbox_label')}
            isChecked={isChecked}
            onPress={() => setIsChecked(!isChecked)}
          />
        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            style={styles.button}
            accessibilityRole={'button'}
            accessible
            label={strings('default_settings.sheet.buttons.cancel')}
            onPress={handleCancel}
          />
          <View style={styles.spacer} />
          <Button
            variant={ButtonVariants.Primary}
            isDisabled={!isChecked}
            isDanger
            size={ButtonSize.Lg}
            style={styles.button}
            accessibilityRole={'button'}
            accessible
            label={strings('default_settings.sheet.buttons.reset')}
            onPress={handleSwitchToggle}
          />
        </View>
      </View>
    </View>
  );

  return (
    <BottomSheet ref={bottomSheetRef}>{resetNotificationsStoreKey()}</BottomSheet>
  );
};

export default ResetNotificationsModal;
