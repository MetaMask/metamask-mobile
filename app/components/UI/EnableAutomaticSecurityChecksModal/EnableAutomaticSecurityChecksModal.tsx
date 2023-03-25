import React, { useCallback, useEffect, useRef } from 'react';
import { View, Image, Platform } from 'react-native';
import { createStyles } from './styles';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { useTheme } from '../../../util/theme';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useDispatch } from 'react-redux';
import {
  setAutomaticSecurityChecks,
  setAutomaticSecurityChecksModalOpen,
  userSelectedAutomaticSecurityChecksOptions,
} from '../../../actions/security';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import { ScrollView } from 'react-native-gesture-handler';
import {
  ENABLE_AUTOMATIC_SECURITY_CHECK_CONTAINER_ID,
  ENABLE_AUTOMATIC_SECURITY_CHECK_NO_THANKS_BUTTON,
} from '../../../../wdio/screen-objects/testIDs/Screens/EnableAutomaticSecurityChecksScreen.testIds';

import generateTestId from '../../../../wdio/utils/generateTestId';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const onboardingDeviceImage = require('../../../images/swaps_onboard_device.png');

export const createEnableAutomaticSecurityChecksModalNavDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.MODAL.ENABLE_AUTOMATIC_SECURITY_CHECKS,
  );

const EnableAutomaticSecurityChecksModal = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const modalRef = useRef<ReusableModalRef | null>(null);
  const dispatch = useDispatch();

  const dismissModal = (cb?: () => void): void =>
    modalRef?.current?.dismissModal(cb);

  useEffect(() => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.AUTOMATIC_SECURITY_CHECKS_PROMPT_VIEWED,
      generateDeviceAnalyticsMetaData(),
    );
  }, []);

  useEffect(() => {
    dispatch(setAutomaticSecurityChecksModalOpen(true));
    return () => {
      dispatch(setAutomaticSecurityChecksModalOpen(false));
    };
  }, [dispatch]);

  const triggerCloseAndDisableAutomaticSecurityChecks = useCallback(
    () =>
      dismissModal(() => {
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT,
          generateDeviceAnalyticsMetaData(),
        );
        dispatch(userSelectedAutomaticSecurityChecksOptions());
      }),
    [dispatch],
  );

  const enableAutomaticSecurityChecks = useCallback(() => {
    dismissModal(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.AUTOMATIC_SECURITY_CHECKS_ENABLED_FROM_PROMPT,
        generateDeviceAnalyticsMetaData(),
      );
      dispatch(userSelectedAutomaticSecurityChecksOptions());
      dispatch(setAutomaticSecurityChecks(true));
    });
  }, [dispatch]);

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={styles.images}
          {...generateTestId(
            Platform,
            ENABLE_AUTOMATIC_SECURITY_CHECK_CONTAINER_ID,
          )}
        >
          <Image source={onboardingDeviceImage} />
        </View>
        <Text variant={TextVariant.DisplayMD} style={styles.title}>
          {strings('enable_automatic_security_check_modal.title')}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.description}>
          {strings('enable_automatic_security_check_modal.description')}
        </Text>
      </ScrollView>
      <View style={styles.actionButtonWrapper}>
        <Button
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
          label={strings(
            'enable_automatic_security_check_modal.primary_action',
          )}
          onPress={enableAutomaticSecurityChecks}
          style={styles.actionButton}
        />
        <Button
          variant={ButtonVariants.Link}
          width={ButtonWidthTypes.Full}
          label={strings(
            'enable_automatic_security_check_modal.secondary_action',
          )}
          {...generateTestId(
            Platform,
            ENABLE_AUTOMATIC_SECURITY_CHECK_NO_THANKS_BUTTON,
          )}
          size={ButtonSize.Md}
          onPress={triggerCloseAndDisableAutomaticSecurityChecks}
        />
      </View>
    </ReusableModal>
  );
};

export default React.memo(EnableAutomaticSecurityChecksModal);
