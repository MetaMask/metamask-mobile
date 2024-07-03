// Third party dependencies.
import React, { useRef } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

// External dependencies.
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
import createStyles from './ProfileSyncingModal.styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { selectIsProfileSyncingEnabled } from '../../../../selectors/pushNotifications';
import { useProfileSyncing } from '../../../../util/notifications/hooks/useProfileSyncing';
import { useDisableNotifications } from '../../../../util/notifications/hooks/useNotifications';

const ProfileSyncingModal = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isChecked, setIsChecked] = React.useState(false);
  const { disableProfileSyncing } = useProfileSyncing();
  const { disableNotifications } = useDisableNotifications();

  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);

  // TODO: Handle errror/loading states from enabling/disabling profile syncing
  const closeBottomSheet = () => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      if (isProfileSyncingEnabled) {
        disableProfileSyncing();
        disableNotifications();
      }
    });
  };

  const handleSwitchToggle = () => {
    closeBottomSheet();
  };

  const handleCancel = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  const turnContent = !isProfileSyncingEnabled
    ? {
        icon: {
          name: IconName.Check,
          color: IconColor.Success,
        },
        bottomSheetTitle: strings('profile_sync.bottomSheetTurnOn'),
        bottomSheetMessage: strings('profile_sync.enable_description'),
        bottomSheetCTA: strings('default_settings.sheet.buttons.turn_on'),
      }
    : {
        icon: {
          name: IconName.Danger,
          color: IconColor.Error,
        },
        bottomSheetTitle: strings('profile_sync.bottomSheetTurnOff'),
        bottomSheetMessage: strings('profile_sync.disable_warning'),
        bottomSheetCTA: strings('default_settings.sheet.buttons.turn_off'),
      };

  const renderTurnOnOFfContent = () => (
    <View style={styles.container}>
      <Icon
        name={turnContent.icon.name}
        color={turnContent.icon.color}
        size={IconSize.Xl}
        style={styles.icon}
      />
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {turnContent.bottomSheetTitle}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.description}>
        {turnContent.bottomSheetMessage}
      </Text>
      <View style={styles.bottom}>
        {isProfileSyncingEnabled && (
          <Checkbox
            label={strings('default_settings.sheet.checkbox_label')}
            isChecked={isChecked}
            onPress={() => setIsChecked(!isChecked)}
          />
        )}
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
            isDisabled={isProfileSyncingEnabled ? !isChecked : false}
            isDanger={isProfileSyncingEnabled}
            size={ButtonSize.Lg}
            style={styles.button}
            accessibilityRole={'button'}
            accessible
            label={turnContent.bottomSheetCTA}
            onPress={handleSwitchToggle}
          />
        </View>
      </View>
    </View>
  );

  return (
    <BottomSheet ref={bottomSheetRef}>{renderTurnOnOFfContent()}</BottomSheet>
  );
};

export default ProfileSyncingModal;
