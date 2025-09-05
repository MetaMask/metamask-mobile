import React, { useCallback, useRef, useEffect } from 'react';
import { View, Image, Linking, Platform } from 'react-native';
import { createStyles } from './styles';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import Logger from '../../../util/Logger';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import HeaderBase from '../../../component-library/components/HeaderBase';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { MM_APP_STORE_LINK, MM_PLAY_STORE_LINK } from '../../../constants/urls';
import { MetaMetricsEvents } from '../../../core/Analytics';

import { ScrollView } from 'react-native-gesture-handler';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { useMetrics } from '../../../components/hooks/useMetrics';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const foxLogo = require('../../../images/branding/fox.png');
const metamaskName = require('../../../images/branding/metamask-name.png');

const UpdateNeeded = () => {
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);
  const modalRef = useRef<ReusableModalRef | null>(null);

  useEffect(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.FORCE_UPGRADE_UPDATE_NEEDED_PROMPT_VIEWED,
      )
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const dismissModal = (cb?: () => void): void =>
    modalRef?.current?.dismissModal(cb);

  const triggerClose = () =>
    dismissModal(() => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.FORCE_UPGRADE_REMIND_ME_LATER_CLICKED,
        )
          .addProperties({
            ...generateDeviceAnalyticsMetaData(),
          })
          .build(),
      );
    });

  const openAppStore = useCallback(() => {
    const link = Platform.OS === 'ios' ? MM_APP_STORE_LINK : MM_PLAY_STORE_LINK;
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.FORCE_UPGRADE_UPDATE_TO_THE_LATEST_VERSION_CLICKED,
      )
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
          link,
        })
        .build(),
    );

    Linking.canOpenURL(link).then(
      (supported) => {
        supported && Linking.openURL(link);
      },
      (err) => Logger.error(err, 'Unable to perform update'),
    );
  }, [trackEvent, createEventBuilder]);

  const onUpdatePressed = useCallback(() => {
    dismissModal(openAppStore);
  }, [openAppStore]);

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <HeaderBase
        style={styles.header}
        includesTopInset
        endAccessory={
          <ButtonIcon
            onPress={triggerClose}
            iconName={IconName.Close}
            iconColor={IconColor.Default}
            testID="update-needed-modal-close-button"
          />
        }
      >
        <Image
          style={styles.headerLogo}
          source={metamaskName}
          resizeMode="contain"
        />
      </HeaderBase>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.images}>
          <Image
            source={foxLogo}
            style={styles.foxImage}
            resizeMethod="auto"
            resizeMode="contain"
          />
        </View>
        <Text variant={TextVariant.HeadingLG} style={styles.title}>
          {strings('update_needed.title')}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.description}>
          {strings('update_needed.description')}
        </Text>
      </ScrollView>
      <View style={styles.actionButtonWrapper}>
        <Button
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
          label={strings('update_needed.primary_action')}
          onPress={onUpdatePressed}
          style={styles.actionButton}
        />
      </View>
    </ReusableModal>
  );
};

export default React.memo(UpdateNeeded);
