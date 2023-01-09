import React, { useCallback, useRef, useEffect } from 'react';
import { View, Image, Linking, Platform } from 'react-native';
import { createStyles } from './styles';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariants,
} from '../../../component-library/components/Texts/Text';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { useTheme } from '../../../util/theme';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import Logger from '../../../util/Logger';
import ButtonTertiary, {
  ButtonTertiaryVariants,
} from '../../../component-library/components/Buttons/Button/variants/ButtonTertiary';
import { ButtonSize } from '../../../component-library/components/Buttons/Button';
import ButtonPrimary from '../../../component-library/components/Buttons/Button/variants/ButtonPrimary';
import { MM_APP_STORE_LINK, MM_PLAY_STORE_LINK } from '../../../constants/urls';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { trackEvent } from '../../../util/analyticsV2';
import { ScrollView } from 'react-native-gesture-handler';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const onboardingDeviceImage = require('../../../images/swaps_onboard_device.png');

export const createUpdateNeededNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.MODAL.UPDATE_NEEDED,
);

const UpdateNeeded = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const modalRef = useRef<ReusableModalRef | null>(null);

  useEffect(() => {
    trackEvent(
      MetaMetricsEvents.FORCE_UPGRADE_UPDATE_NEEDED_PROMPT_VIEWED,
      generateDeviceAnalyticsMetaData(),
    );
  }, []);

  const dismissModal = (cb?: () => void): void =>
    modalRef?.current?.dismissModal(cb);

  const triggerClose = () =>
    dismissModal(() => {
      trackEvent(
        MetaMetricsEvents.FORCE_UPGRADE_REMIND_ME_LATER_CLICKED,
        generateDeviceAnalyticsMetaData(),
      );
    });

  const openAppStore = useCallback(() => {
    const link = Platform.OS === 'ios' ? MM_APP_STORE_LINK : MM_PLAY_STORE_LINK;
    trackEvent(
      MetaMetricsEvents.FORCE_UPGRADE_UPDATE_TO_THE_LATEST_VERSION_CLICKED,
      { ...generateDeviceAnalyticsMetaData(), link },
    );
    Linking.canOpenURL(link).then(
      (supported) => {
        supported && Linking.openURL(link);
      },
      (err) => Logger.error(err, 'Unable to perform update'),
    );
  }, []);

  const onUpdatePressed = useCallback(() => {
    dismissModal(openAppStore);
  }, [openAppStore]);

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.images}>
          <Image source={onboardingDeviceImage} />
        </View>
        <Text variant={TextVariants.lHeadingLG} style={styles.title}>
          {strings('update_needed.title')}
        </Text>
        <Text variant={TextVariants.sBodyMD} style={styles.description}>
          {strings('update_needed.description')}
        </Text>
      </ScrollView>
      <View style={styles.actionButtonWrapper}>
        <ButtonPrimary
          label={strings('update_needed.primary_action')}
          onPress={onUpdatePressed}
          style={styles.actionButton}
        />
        <ButtonTertiary
          label={strings('update_needed.secondary_action')}
          size={ButtonSize.Md}
          onPress={triggerClose}
          buttonTertiaryVariants={ButtonTertiaryVariants.Normal}
        />
      </View>
    </ReusableModal>
  );
};

export default React.memo(UpdateNeeded);
