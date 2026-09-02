import React, { useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { setBasicFunctionalityMigrationNotificationPending } from '../../../../actions/settings';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useTheme } from '../../../../util/theme';
import createStyles from '../../Notification/Modal/styles';

const BasicFunctionalityMigrationModal = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const dismiss = () => {
    dispatch(setBasicFunctionalityMigrationNotificationPending(false));
  };

  const closeSheet = (afterClose?: () => void) => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      dismiss();
      afterClose?.();
    });
  };

  const openPrivacySettings = () => {
    closeSheet(() => {
      navigation.navigate(Routes.SETTINGS_VIEW, {
        screen: Routes.SETTINGS.SECURITY_SETTINGS,
      });
    });
  };

  return (
    <BottomSheet ref={bottomSheetRef} onClose={dismiss}>
      <View style={styles.container}>
        <Text variant={TextVariant.HeadingMd} style={styles.title}>
          {strings('default_settings.migration_modal.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          style={styles.subtitle}
        >
          {strings('default_settings.migration_modal.description')}
        </Text>
        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            style={styles.button}
            onPress={openPrivacySettings}
            testID="basic-functionality-migration-modal-open-settings"
          >
            {strings('default_settings.migration_modal.open_settings')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default BasicFunctionalityMigrationModal;
