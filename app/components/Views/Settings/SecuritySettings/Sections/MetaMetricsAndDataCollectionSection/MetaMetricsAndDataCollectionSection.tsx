import { Alert, Linking, Switch, View } from 'react-native';
import {
  META_METRICS_DATA_MARKETING_SECTION,
  META_METRICS_SECTION,
} from '../../SecuritySettings.constants';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { HOW_TO_MANAGE_METRAMETRICS_SETTINGS } from '../../../../../../constants/urls';
import React, { useEffect, useState } from 'react';
import createStyles from '../../SecuritySettings.styles';
import { useTheme } from '../../../../../../util/theme';
import generateDeviceAnalyticsMetaData, {
  UserSettingsAnalyticsMetaData as generateUserSettingsAnalyticsMetaData,
} from '../../../../../../util/metrics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { setDataCollectionForMarketing } from '../../../../../../actions/security';
import Routes from '../../../../../../constants/navigation/Routes';
import { analytics } from '../../../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../../../util/analytics/AnalyticsEventBuilder';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { UserProfileProperty } from '../../../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { RootState } from '../../../../../../reducers';
import { useAutoSignIn } from '../../../../../../util/identity/hooks/useAuthentication';
import OAuthService from '../../../../../../core/OAuthService/OAuthService';
import Logger from '../../../../../../util/Logger';
import { selectSeedlessOnboardingLoginFlow } from '../../../../../../selectors/seedlessOnboardingController';
import { storePna25Acknowledged } from '../../../../../../actions/legalNotices';
import { selectIsPna25Acknowledged } from '../../../../../../selectors/legalNotices';
import { selectIsPna25FlagEnabled } from '../../../../../../selectors/featureFlagController/legalNotices';

interface MetaMetricsAndDataCollectionSectionProps {
  hideMarketingSection?: boolean;
}

const MetaMetricsAndDataCollectionSection: React.FC<
  MetaMetricsAndDataCollectionSectionProps
> = ({ hideMarketingSection = false }) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const dispatch = useDispatch();
  const isDataCollectionForMarketingEnabled = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.security.dataCollectionForMarketing,
  );
  const navigation = useNavigation();
  const { autoSignIn } = useAutoSignIn();

  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );

  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );

  const isPna25FlagEnabled = useSelector(selectIsPna25FlagEnabled);
  const isPna25Acknowledged = useSelector(selectIsPna25Acknowledged);

  useEffect(() => {
    if (!isBasicFunctionalityEnabled) {
      analytics.optOut().catch(() => {
        // Error already logged in optOut
      });
      setAnalyticsEnabled(false);
      dispatch(setDataCollectionForMarketing(false));
      return;
    }

    autoSignIn();
    const fetchMarketingStatus = async () => {
      try {
        const data = await OAuthService.getMarketingOptInStatus();
        dispatch(setDataCollectionForMarketing(data.is_opt_in));
      } catch (err) {
        Logger.error(err as Error);
      }
    };

    if (isSeedlessOnboardingLoginFlow) {
      fetchMarketingStatus();
    }
    setAnalyticsEnabled(analytics.isEnabled());
  }, [
    setAnalyticsEnabled,
    autoSignIn,
    isBasicFunctionalityEnabled,
    dispatch,
    isSeedlessOnboardingLoginFlow,
  ]);

  const toggleMetricsOptIn = async (metricsEnabled: boolean) => {
    if (metricsEnabled) {
      const consolidatedTraits = {
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
      };
      await analytics.optIn();

      setAnalyticsEnabled(true);

      analytics.identify(consolidatedTraits);
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
        )
          .addProperties({
            is_metrics_opted_in: true,
            updated_after_onboarding: true,
            location: 'settings',
          })
          .build(),
      );

      // If user has not acknowledged PNA25 and is enabling metrics
      // we count this as an acknowledgement of PNA25
      // and the PNA25 notice is not shown to them
      if (isPna25FlagEnabled && !isPna25Acknowledged) {
        dispatch(storePna25Acknowledged());
      }
    } else {
      await analytics.optOut();
      setAnalyticsEnabled(false);
      if (isDataCollectionForMarketingEnabled) {
        dispatch(setDataCollectionForMarketing(false));
      }
      Alert.alert(
        strings('app_settings.metametrics_opt_out'),
        strings('app_settings.metametrics_restart_required'),
      );
    }
  };

  const addMarketingConsentToTraits = (marketingOptIn: boolean) => {
    analytics.identify({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: marketingOptIn
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
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

  const toggleDataCollectionForMarketing = async (value: boolean) => {
    if (value) {
      if (!analyticsEnabled) {
        await toggleMetricsOptIn(true);
      }
      addMarketingConsentToTraits(value);
    } else {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.DATA_COLLECTION,
      });

      if (analyticsEnabled) {
        addMarketingConsentToTraits(value);
      }
    }

    // Store the previous state to revert if API fails
    const previousMarketingState = !value;

    // Update client state optimistically
    dispatch(setDataCollectionForMarketing(value));

    // Sync with server, revert client state if API fails
    if (isSeedlessOnboardingLoginFlow) {
      OAuthService.updateMarketingOptInStatus(value).catch((error) => {
        Logger.error(error as Error);
        // Revert client state back to previous value if API fails
        dispatch(setDataCollectionForMarketing(previousMarketingState));
      });
    }
  };

  const renderMetaMetricsSection = () => (
    <View style={styles.halfSetting} testID={META_METRICS_SECTION}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
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
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.metametrics_description')}{' '}
        <Button
          variant={ButtonVariants.Link}
          size={ButtonSize.Auto}
          onPress={() => Linking.openURL(HOW_TO_MANAGE_METRAMETRICS_SETTINGS)}
          label={strings('app_settings.learn_more')}
        />
      </Text>
    </View>
  );

  const renderDataCollectionSection = () => (
    <View
      style={styles.halfSetting}
      testID={META_METRICS_DATA_MARKETING_SECTION}
    >
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.data_collection_title')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            disabled={!isBasicFunctionalityEnabled}
            value={isDataCollectionForMarketingEnabled}
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
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
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
    </>
  );
};

export default React.memo(MetaMetricsAndDataCollectionSection);
