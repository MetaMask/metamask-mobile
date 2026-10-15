import { Alert, Linking, Switch, View } from 'react-native';
import { selectMarketingConsent } from '../../../../../../selectors/analyticsController';
import {
  META_METRICS_DATA_MARKETING_SECTION,
  META_METRICS_SECTION,
} from '../../SecuritySettings.constants';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { TextVariant as LibraryTextVariant } from '../../../../../../component-library/components/Texts/Text';
import { HOW_TO_MANAGE_METRAMETRICS_SETTINGS } from '../../../../../../constants/urls';
import React, { useEffect, useState } from 'react';
import createStyles from '../../SecuritySettings.styles';
import generateDeviceAnalyticsMetaData, {
  UserSettingsAnalyticsMetaData as generateUserSettingsAnalyticsMetaData,
} from '../../../../../../util/metrics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { setDataCollectionForMarketing } from '../../../../../../actions/security';
import { analytics } from '../../../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../../../util/analytics/AnalyticsEventBuilder';
import { useDispatch, useSelector } from 'react-redux';
import { UserProfileProperty } from '../../../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { RootState } from '../../../../../../reducers';
import { useAutoSignIn } from '../../../../../../util/identity/hooks/useAuthentication';
import { updateCachedConsent } from '../../../../../../util/trace';
import { selectOnboardingAccountType } from '../../../../../../selectors/onboarding';
import { storePna25Acknowledged } from '../../../../../../actions/legalNotices';
import { selectIsPna25Acknowledged } from '../../../../../../selectors/legalNotices';
import { useStyles } from '../../../../../../component-library/hooks/useStyles';
import Engine from '../../../../../../core/Engine';
import { selectIsSignedIn } from '../../../../../../selectors/identity';
import MarketingConsentSheet from '../../../../../UI/MarketingConsentSheet/MarketingConsentSheet';

export const MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID =
  'marketing-consent-opt-out-sheet';

interface MetaMetricsAndDataCollectionSectionProps {
  hideMarketingSection?: boolean;
  analyticsLocation?: 'settings' | 'onboarding_default_settings';
  /** Ref to the MetaMetrics sub-section, used as a scroll target. */
  metaMetricsRef?: React.Ref<View>;
  /** Ref to the marketing data collection sub-section, used as a scroll target. */
  dataCollectionRef?: React.Ref<View>;
}

const MetaMetricsAndDataCollectionSection: React.FC<
  MetaMetricsAndDataCollectionSectionProps
> = ({
  hideMarketingSection = false,
  analyticsLocation = 'settings',
  metaMetricsRef,
  dataCollectionRef,
}) => {
  const { styles, theme } = useStyles(createStyles, {});
  const { colors } = theme;
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [isOptOutSheetVisible, setIsOptOutSheetVisible] = useState(false);
  const isSignedIn = useSelector(selectIsSignedIn);
  const dispatch = useDispatch();
  const isDataCollectionForMarketingEnabled = useSelector(
    selectMarketingConsent,
  );
  const { autoSignIn } = useAutoSignIn();

  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );

  const accountType = useSelector(selectOnboardingAccountType);

  const isPna25Acknowledged = useSelector(selectIsPna25Acknowledged);

  useEffect(() => {
    if (!isBasicFunctionalityEnabled) {
      analytics.optOut().catch(() => {
        // Error already logged in optOut
      });
      setAnalyticsEnabled(false);
      updateCachedConsent(false);
      // Marketing consent is synced across devices, so a device-local Basic
      // Functionality switch only disables the toggle and never revokes it.
      return;
    }

    autoSignIn();
    setAnalyticsEnabled(analytics.isEnabled());
    updateCachedConsent(analytics.isEnabled());
  }, [setAnalyticsEnabled, autoSignIn, isBasicFunctionalityEnabled]);

  const toggleMetricsOptIn = async (metricsEnabled: boolean) => {
    if (metricsEnabled) {
      const consolidatedTraits = {
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
      };
      await analytics.optIn();

      setAnalyticsEnabled(true);
      updateCachedConsent(true);

      analytics.identify(consolidatedTraits);
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.METRICS_OPT_IN,
        )
          .addProperties({
            updated_after_onboarding: true,
            location: analyticsLocation,
            ...(accountType && { account_type: accountType }),
          })
          .build(),
      );
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
        )
          .addProperties({
            is_metrics_opted_in: true,
            updated_after_onboarding: true,
            location: analyticsLocation,
            ...(accountType && { account_type: accountType }),
          })
          .build(),
      );

      // If user has not acknowledged PNA25 and is enabling metrics
      // we count this as an acknowledgement of PNA25
      // and the PNA25 notice is not shown to them
      if (!isPna25Acknowledged) {
        dispatch(storePna25Acknowledged());
      }
    } else {
      // Track opt-out event before calling optOut() to ensure it gets sent
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.METRICS_OPT_OUT,
        )
          .addProperties({
            updated_after_onboarding: true,
            location: analyticsLocation,
            ...(accountType && { account_type: accountType }),
          })
          .build(),
      );

      await analytics.optOut();
      setAnalyticsEnabled(false);
      updateCachedConsent(false);

      Alert.alert(
        strings('app_settings.metametrics_opt_out'),
        strings('app_settings.metametrics_restart_required'),
      );
    }
  };

  const addMarketingConsentToTraits = (marketingOptIn: boolean) => {
    analytics.identify({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: marketingOptIn,
    });
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
      )
        .addProperties({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: marketingOptIn,
          updated_after_onboarding: true,
          location: 'settings',
        })
        .build(),
    );
  };

  // The "Updates and rewards" channels live in AUS, so only a signed-in user
  // can have them on.
  const hasMarketingNotificationsOn = async () => {
    if (!isSignedIn) {
      return false;
    }
    try {
      const preferences = await Engine.controllerMessenger.call(
        'AuthenticatedUserStorageService:getNotificationPreferences',
      );
      return Boolean(
        preferences?.marketing.pushNotificationsEnabled ||
          preferences?.marketing.inAppNotificationsEnabled,
      );
    } catch {
      // Unknown: the opt-out turns the channels off in AUS anyway.
      return false;
    }
  };

  // Confirming saves the opt-out to AUS, which also turns the "Updates and
  // rewards" channels off. A failed save keeps the sheet open.
  const confirmMarketingOptOut = async () => {
    await Engine.controllerMessenger.call(
      'MarketingConsentController:setMarketingConsent',
      false,
    );
    if (analyticsEnabled) {
      addMarketingConsentToTraits(false);
    }
  };

  const toggleDataCollectionForMarketing = async (value: boolean) => {
    if (!value && (await hasMarketingNotificationsOn())) {
      setIsOptOutSheetVisible(true);
      return;
    }

    if (analyticsEnabled) {
      addMarketingConsentToTraits(value);
    }

    dispatch(setDataCollectionForMarketing(value));
  };

  const renderMetaMetricsSection = () => (
    <View
      ref={metaMetricsRef}
      style={styles.halfSetting}
      testID={META_METRICS_SECTION}
    >
      <View style={styles.titleContainer}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          style={styles.title}
        >
          {strings('app_settings.metametrics_title')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            disabled={!isBasicFunctionalityEnabled}
            value={analyticsEnabled}
            onValueChange={toggleMetricsOptIn}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            testID={SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        style={styles.desc}
      >
        {strings('app_settings.metametrics_description')}{' '}
        <Button
          variant={ButtonVariants.Link}
          size={ButtonSize.Auto}
          labelTextVariant={LibraryTextVariant.BodySMMedium}
          onPress={() => Linking.openURL(HOW_TO_MANAGE_METRAMETRICS_SETTINGS)}
          label={strings('app_settings.learn_more')}
        />
      </Text>
    </View>
  );

  const renderDataCollectionSection = () => (
    <View
      ref={dataCollectionRef}
      style={styles.halfSetting}
      testID={META_METRICS_DATA_MARKETING_SECTION}
    >
      <View style={styles.titleContainer}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          style={styles.title}
        >
          {strings('app_settings.data_collection_title')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            disabled={!isBasicFunctionalityEnabled}
            value={isDataCollectionForMarketingEnabled === true}
            onValueChange={toggleDataCollectionForMarketing}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            testID={SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        style={styles.desc}
      >
        {strings('app_settings.data_collection_description')}
      </Text>
    </View>
  );

  return (
    <>
      {renderMetaMetricsSection()}
      {!hideMarketingSection && renderDataCollectionSection()}
      {isOptOutSheetVisible ? (
        <MarketingConsentSheet
          title={strings('marketing_consent_sheet.opt_out_title')}
          description={
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('marketing_consent_sheet.opt_out_description')}
            </Text>
          }
          confirmLabel={strings('marketing_consent_sheet.opt_out_confirm')}
          onConfirm={confirmMarketingOptOut}
          onDismiss={() => setIsOptOutSheetVisible(false)}
          testID={MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID}
        />
      ) : null}
    </>
  );
};

export default React.memo(MetaMetricsAndDataCollectionSection);
