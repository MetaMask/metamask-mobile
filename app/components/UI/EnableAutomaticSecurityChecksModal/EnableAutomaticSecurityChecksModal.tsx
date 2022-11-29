import React, { useCallback, useRef } from 'react';
import { View, Image, Platform } from 'react-native';
import { createStyles } from './styles';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariants,
} from '../../../component-library/components/Texts/Text';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { useTheme } from '../../../util/theme';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import ButtonTertiary, {
  ButtonTertiaryVariants,
} from '../../../component-library/components/Buttons/Button/variants/ButtonTertiary';
import { ButtonSize } from '../../../component-library/components/Buttons/Button';
import ButtonPrimary from '../../../component-library/components/Buttons/Button/variants/ButtonPrimary';
import { useDispatch } from 'react-redux';
import {
  setAutomaticSecurityChecks,
  userSelectedAutomaticSecurityChecksOptions,
} from '../../../actions/security';
import AnalyticsV2 from '../../../util/analyticsV2';
import { ScrollView } from 'react-native-gesture-handler';
import {
  ENABLE_AUTOMATIC_SECURITY_CHECK_CONTAINER_ID,
  ENABLE_AUTOMATIC_SECURITY_CHECK_NO_THANKS_BUTTON,
} from '../../../../wdio/features/testIDs/Screens/EnableAutomaticSecurityChecksScreen.testIds';

import generateTestId from '../../../../wdio/utils/generateTestId';

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

  const triggerCloseAndDisableAutomaticSecurityChecks = useCallback(
    () =>
      dismissModal(() => {
        AnalyticsV2.trackEvent(
          AnalyticsV2.ANALYTICS_EVENTS
            .AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT,
          { platform: Platform.OS },
        );
        dispatch(userSelectedAutomaticSecurityChecksOptions());
      }),
    [dispatch],
  );

  const enableAutomaticSecurityChecks = useCallback(() => {
    dismissModal(() => {
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS
          .AUTOMATIC_SECURITY_CHECKS_ENABLED_FROM_PROMPT,
        { platform: Platform.OS },
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
        <Text variant={TextVariants.lHeadingLG} style={styles.title}>
          {strings('enable_automatic_security_check_modal.title')}
        </Text>
        <Text variant={TextVariants.sBodyMD} style={styles.description}>
          {strings('enable_automatic_security_check_modal.description')}
        </Text>
      </ScrollView>
      <View style={styles.actionButtonWrapper}>
        <ButtonPrimary
          label={strings(
            'enable_automatic_security_check_modal.primary_action',
          )}
          onPress={enableAutomaticSecurityChecks}
          style={styles.actionButton}
        />
        <ButtonTertiary
          label={strings(
            'enable_automatic_security_check_modal.secondary_action',
          )}
          {...generateTestId(
            Platform,
            ENABLE_AUTOMATIC_SECURITY_CHECK_NO_THANKS_BUTTON,
          )}
          size={ButtonSize.Md}
          onPress={triggerCloseAndDisableAutomaticSecurityChecks}
          buttonTertiaryVariants={ButtonTertiaryVariants.Normal}
        />
      </View>
    </ReusableModal>
  );
};

export default React.memo(EnableAutomaticSecurityChecksModal);
