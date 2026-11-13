import React, { useRef } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import createStyles from './styles';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { ExperienceEnhancerBottomSheetSelectorsIDs } from './ExperienceEnhancerModal.testIds';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import OAuthService from '../../../core/OAuthService/OAuthService';
import Logger from '../../../util/Logger';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';

const ExperienceEnhancerModal = () => {
  const dispatch = useDispatch();
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);
  const styles = createStyles();
  const { trackEvent, identify, createEventBuilder } = useAnalytics();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  // Social-login wallets also store the choice server-side so the auth
  // service can create the HubSpot contact for email marketing. A failed
  // sync keeps the local decision.
  const syncMarketingConsentToServer = (value: boolean) => {
    if (isSocialLogin) {
      OAuthService.updateMarketingOptInStatus(value).catch((error) => {
        Logger.error(error as Error);
      });
    }
  };

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('experience_enhancer_modal.cancel'),
    size: ButtonSize.Lg,
    onPress: () => {
      dispatch(setDataCollectionForMarketing(false));
      syncMarketingConsentToServer(false);
      bottomSheetRef.current?.onCloseBottomSheet();

      identify({
        [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
      });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED)
          .addProperties({
            [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
            updated_after_onboarding: true,
            location: 'marketing_consent_modal',
          })
          .build(),
      );
    },
    testID: ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON,
  };

  const acceptButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('experience_enhancer_modal.accept'),
    size: ButtonSize.Lg,
    onPress: () => {
      dispatch(setDataCollectionForMarketing(true));
      syncMarketingConsentToServer(true);
      bottomSheetRef.current?.onCloseBottomSheet();

      identify({
        [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
      });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED)
          .addProperties({
            [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
            updated_after_onboarding: true,
            location: 'marketing_consent_modal',
          })
          .build(),
      );
    },
    testID: ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON,
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      testID={ExperienceEnhancerBottomSheetSelectorsIDs.BOTTOM_SHEET}
    >
      <Text
        variant={TextVariant.HeadingMd}
        style={styles.title}
        testID={ExperienceEnhancerBottomSheetSelectorsIDs.TITLE}
      >
        {strings('experience_enhancer_modal.title')}
      </Text>
      <View
        style={styles.content}
        testID={ExperienceEnhancerBottomSheetSelectorsIDs.CONTENT}
      >
        <Text variant={TextVariant.BodyMd}>
          {strings('experience_enhancer_modal.paragraph1b')}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          testID={ExperienceEnhancerBottomSheetSelectorsIDs.PARAGRAPH_2}
        >
          {strings('experience_enhancer_modal.paragraph2')}
        </Text>
        <View style={styles.list}>
          <Text
            style={styles.line}
            testID={ExperienceEnhancerBottomSheetSelectorsIDs.BULLET_1}
          >
            <Text style={styles.dot}>•</Text>{' '}
            {strings('experience_enhancer_modal.bullet1')}
          </Text>
          <Text
            style={styles.line}
            testID={ExperienceEnhancerBottomSheetSelectorsIDs.BULLET_2}
          >
            <Text style={styles.dot}>•</Text>{' '}
            {strings('experience_enhancer_modal.bullet2')}
          </Text>
          <Text
            style={styles.line}
            testID={ExperienceEnhancerBottomSheetSelectorsIDs.BULLET_3}
          >
            <Text style={styles.dot}>•</Text>{' '}
            {strings('experience_enhancer_modal.bullet3')}
          </Text>
        </View>
        <Text
          variant={TextVariant.BodyMd}
          testID={ExperienceEnhancerBottomSheetSelectorsIDs.FOOTER}
        >
          {strings('experience_enhancer_modal.footer')}
        </Text>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={[cancelButtonProps, acceptButtonProps]}
        />
      </View>
    </BottomSheet>
  );
};

export default ExperienceEnhancerModal;
