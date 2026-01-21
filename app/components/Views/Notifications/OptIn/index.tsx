import React, { Fragment } from 'react';
import { Image, View, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useMetrics } from '../../../../components/hooks/useMetrics';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import HeaderCenter from '../../../../component-library/components-temp/HeaderCenter';
import { useTheme } from '../../../../util/theme';
import EnableNotificationsCardPlaceholder from '../../../../images/enableNotificationsCard.png';
import { createStyles } from './styles';
import AppConstants from '../../../../core/AppConstants';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import SwitchLoadingModal from '../../../../components/UI/Notification/SwitchLoadingModal';
import { useHandleOptInCancel, useHandleOptInClick } from './OptIn.hooks';
import { EnableNotificationModalSelectorsIDs } from './EnableNotificationModal.testIds';

const OptIn = () => {
  const metrics = useMetrics();
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();

  const { enableNotifications, loading } = useEnableNotifications({
    nudgeEnablePush: true,
  });

  const handleOptInCancel = useHandleOptInCancel({
    navigation,
    metrics,
    isCreatingNotifications: loading,
  });

  const handleOptInClick = useHandleOptInClick({
    navigation,
    metrics,
    enableNotifications,
  });

  const goToLearnMore = () => {
    Linking.openURL(AppConstants.URLS.PROFILE_SYNC);
  };

  return (
    <Fragment>
      <SafeAreaView style={styles.wrapper}>
        <HeaderCenter
          title={strings('notifications.activation_card.title')}
          onClose={handleOptInCancel}
          testID={EnableNotificationModalSelectorsIDs.TITLE}
        />
        <ScrollView style={styles.contentContainer}>
          <View style={styles.card}>
            <Image
              source={EnableNotificationsCardPlaceholder}
              style={styles.image}
            />
          </View>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.textSpace}
          >
            {strings('notifications.activation_card.description_1')}
          </Text>

          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.textSpace}
          >
            {strings('notifications.activation_card.description_2')}{' '}
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Info}
              onPress={goToLearnMore}
            >
              {strings('notifications.activation_card.learn_more')}
            </Text>
          </Text>

          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('notifications.activation_card.manage_preferences_1')}
            <Text
              variant={TextVariant.BodyMDBold}
              color={TextColor.Alternative}
            >
              {strings('notifications.activation_card.manage_preferences_2')}
            </Text>
          </Text>
        </ScrollView>

        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={[
            {
              variant: ButtonVariants.Secondary,
              size: ButtonSize.Lg,
              label: strings('notifications.activation_card.cancel'),
              onPress: handleOptInCancel,
              testID: EnableNotificationModalSelectorsIDs.BUTTON_CANCEL,
            },
            {
              variant: ButtonVariants.Primary,
              size: ButtonSize.Lg,
              label: strings('notifications.activation_card.cta'),
              onPress: handleOptInClick,
              testID: EnableNotificationModalSelectorsIDs.BUTTON_ENABLE,
            },
          ]}
          style={styles.btnContainer}
        />
      </SafeAreaView>
      <SwitchLoadingModal
        loading={loading}
        loadingText={strings('app_settings.enabling_notifications')}
      />
    </Fragment>
  );
};

export default OptIn;
