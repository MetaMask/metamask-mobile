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
import createStyles from './BasicFunctionalityModal.styles';
import { RootState } from 'app/reducers';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Routes from '../../../../constants/navigation/Routes';
import {
  asyncAlert,
  requestPushNotificationsPermission,
} from '../../../../util/notifications';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';

interface Props {
  route: {
    params: {
      caller: string;
    };
  };
}

const BasicFunctionalityModal = ({ route }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isChecked, setIsChecked] = React.useState(false);
  const dispatch = useDispatch();
  const isEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );
  const { enableNotifications } = useEnableNotifications();

  const enableNotificationsFromModal = useCallback(async () => {
    const nativeNotificationStatus = await requestPushNotificationsPermission(
      asyncAlert,
    );

    if (nativeNotificationStatus) {
      await enableNotifications();
    }
  }, [enableNotifications]);

  const closeBottomSheet = async () => {
    bottomSheetRef.current?.onCloseBottomSheet(() =>
      dispatch(toggleBasicFunctionality(!isEnabled)),
    );

    if (route.params.caller === Routes.SETTINGS.NOTIFICATIONS) {
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
