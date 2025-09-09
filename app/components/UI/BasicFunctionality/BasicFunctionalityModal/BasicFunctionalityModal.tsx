// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';

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
import { useDispatch, useSelector } from 'react-redux';
import { toggleBasicFunctionality } from '../../../../actions/settings';
import createStyles from '../../Notification/Modal/styles';
import { RootState } from 'app/reducers';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Routes from '../../../../constants/navigation/Routes';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import { useMetrics } from '../../../hooks/useMetrics';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import { selectIsBackupAndSyncEnabled } from '../../../../selectors/identity';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../util/navigation';

type BasicFunctionalityModalProps = StackScreenProps<
  RootParamList,
  'BasicFunctionality'
>;

const BasicFunctionalityModal = ({ route }: BasicFunctionalityModalProps) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isChecked, setIsChecked] = React.useState(false);
  const dispatch = useDispatch();
  const isEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);
  const isNotificationsFeatureEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const { enableNotifications } = useEnableNotifications();

  const enableNotificationsFromModal = useCallback(async () => {
    const { permission } = await NotificationsService.getAllPermissions(false);
    if (permission !== 'authorized') {
      return;
    }
    enableNotifications();
  }, [enableNotifications]);

  const closeBottomSheet = async () => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      dispatch(toggleBasicFunctionality(!isEnabled));
      trackEvent(
        createEventBuilder(
          !isEnabled
            ? MetaMetricsEvents.BASIC_FUNCTIONALITY_ENABLED
            : MetaMetricsEvents.BASIC_FUNCTIONALITY_DISABLED,
        ).build(),
      );
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SETTINGS_UPDATED)
          .addProperties({
            settings_group: 'security_privacy',
            settings_type: 'basic_functionality',
            old_value: isEnabled,
            new_value: !isEnabled,
            was_notifications_on: isEnabled
              ? isNotificationsFeatureEnabled
              : false,
            was_profile_syncing_on: isEnabled ? isBackupAndSyncEnabled : false,
          })
          .build(),
      );
    });
    if (
      route.params?.caller === Routes.SETTINGS.NOTIFICATIONS ||
      route.params?.caller === Routes.NOTIFICATIONS.OPT_IN
    ) {
      await enableNotificationsFromModal();
    }
  };

  const handleSwitchToggle = () => {
    closeBottomSheet();
  };

  const handleCancel = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  const renderTurnOffContent = () => (
    <View style={styles.container}>
      <Icon
        name={IconName.Danger}
        color={IconColor.Error}
        size={IconSize.Xl}
        style={styles.icon}
      />
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('default_settings.sheet.title_off')}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.description}>
        {strings('default_settings.sheet.description_off')}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.description}>
        {strings('default_settings.sheet.description_off2')}{' '}
        <Text variant={TextVariant.BodyMDBold} style={styles.description}>
          {strings('default_settings.sheet.description_off2_related_features1')}{' '}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.description}>
          {strings(
            'default_settings.sheet.description_off2_related_features1_and',
          )}{' '}
        </Text>
        <Text variant={TextVariant.BodyMDBold} style={styles.description}>
          {strings('default_settings.sheet.description_off2_related_features2')}
        </Text>
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
            label={strings('default_settings.sheet.buttons.turn_off')}
            onPress={handleSwitchToggle}
          />
        </View>
      </View>
    </View>
  );

  const renderTurnOnContent = () => (
    <View style={styles.container}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('default_settings.sheet.title_on')}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.subtitle}>
        {strings('default_settings.sheet.description_on')}
      </Text>
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
          size={ButtonSize.Lg}
          style={styles.button}
          accessibilityRole={'button'}
          accessible
          label={strings('default_settings.sheet.buttons.turn_on')}
          onPress={handleSwitchToggle}
        />
      </View>
    </View>
  );

  return (
    <BottomSheet ref={bottomSheetRef}>
      {isEnabled ? renderTurnOffContent() : renderTurnOnContent()}
    </BottomSheet>
  );
};

export default BasicFunctionalityModal;
