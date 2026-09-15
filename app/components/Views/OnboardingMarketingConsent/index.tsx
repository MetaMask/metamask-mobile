import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Checkbox from '../../../component-library/components/Checkbox';
import { strings } from '../../../../locales/i18n';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { clearOnboardingEvents } from '../../../actions/onboarding';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Engine from '../../../core/Engine';
import OAuthLoginService from '../../../core/OAuthService/OAuthService';
import Logger from '../../../util/Logger';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectWalletSetupCompletedAttributionAnalyticsProps } from '../../../selectors/attribution';
import { selectQrSyncNeedsProvisioning } from '../../../selectors/qrSyncController';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import generateDeviceAnalyticsMetaData, {
  UserSettingsAnalyticsMetaData as generateUserSettingsAnalyticsMetaData,
} from '../../../util/metrics';
import { getConfiguredCaipChainIds } from '../../../util/metrics/MultichainAPI/networkMetricUtils';
import { getWalletSetupAttributionPropsFromStore } from '../../../util/analytics/walletSetupCompletedAttribution';
import { scheduleBufferedOnboardingEventReplay } from '../../../util/analytics/walletSetupCompletedAttributionReplay';
import { replayPendingAppInstall } from '../../../util/analytics/appInstallEvent';
import { continueOnboardingAfterConsent } from '../../../util/onboarding/continueOnboardingAfterConsent';
import { getDefaultMarketingOptInChecked } from '../../../util/onboarding/getDefaultMarketingOptInChecked';
import { selectGeolocationLocation } from '../../../selectors/geolocationController';
import type { OnboardingConsentFlowParams } from '../../../util/onboarding/onboardingConsentFlow';
import { useOnboardingInterestQuestionnaireEligibility } from '../../../hooks/useOnboardingInterestQuestionnaireEligibility';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import type { RootState } from '../../../reducers';
import PrivacyIllustration from '../../../images/privacy_metrics_illustration.png';
import Device from '../../../util/device';
import { OnboardingMarketingConsentSelectorsIDs } from './OnboardingMarketingConsent.testIds';

const OnboardingMarketingConsent = () => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<
        { OnboardingMarketingConsent: OnboardingConsentFlowParams },
        'OnboardingMarketingConsent'
      >
    >();
  const metrics = useAnalytics();
  const consentParams = route.params;
  const isSocialLogin = consentParams.kind === 'social';

  const events = useSelector((state: RootState) => state.onboarding.events);
  const reduxAccountType = useSelector(selectOnboardingAccountType);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const walletSetupAttributionProps = useSelector(
    selectWalletSetupCompletedAttributionAnalyticsProps,
  );
  const needsQrProvisioning = useSelector(selectQrSyncNeedsProvisioning);
  const geolocationLocation = useSelector(selectGeolocationLocation);
  const isMarketingOnByDefault =
    getDefaultMarketingOptInChecked(geolocationLocation);
  const [isMarketingChecked, setIsMarketingChecked] = useState(
    isMarketingOnByDefault,
  );
  const { shouldShowQuestionnaire } =
    useOnboardingInterestQuestionnaireEligibility();

  const accountType = consentParams.accountType ?? reduxAccountType;
  const isMediumDevice = useMemo(() => Device.isMediumDevice(), []);
  const illustrationSize = useMemo(
    () =>
      isMediumDevice
        ? { width: 160, height: 120 }
        : { width: 200, height: 180 },
    [isMediumDevice],
  );

  useEffect(() => {
    void Engine.context.GeolocationController?.refreshGeolocation?.();
  }, []);

  useEffect(() => {
    setIsMarketingChecked(isMarketingOnByDefault);
  }, [isMarketingOnByDefault]);

  const persistChoice = useCallback(
    async (isMarketingOptedIn: boolean) => {
      dispatch(setDataCollectionForMarketing(isMarketingOptedIn));

      if (isSocialLogin) {
        OAuthLoginService.updateMarketingOptInStatus(isMarketingOptedIn).catch(
          (err) => {
            Logger.error(err as Error);
          },
        );
      }

      metrics.trackEvent(
        metrics
          .createEventBuilder(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED)
          .addProperties({
            [UserProfileProperty.HAS_MARKETING_CONSENT]:
              Boolean(isMarketingOptedIn),
            is_metrics_opted_in: true,
            location: isSocialLogin
              ? 'onboarding_marketing_consent'
              : 'onboarding_metametrics',
            updated_after_onboarding: false,
            default_marketing_opt_in: isMarketingOnByDefault,
            ...(accountType && { account_type: accountType }),
          })
          .build(),
      );

      await metrics.identify({
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
        [UserProfileProperty.CHAIN_IDS]: getConfiguredCaipChainIds(),
      });

      if (events?.length) {
        const attributionProps =
          getWalletSetupAttributionPropsFromStore(isMarketingOptedIn);
        scheduleBufferedOnboardingEventReplay({
          events,
          attributionProps,
          trackEvent: (event) => metrics.trackEvent(event),
        });
      }

      await replayPendingAppInstall();
      dispatch(clearOnboardingEvents());

      await continueOnboardingAfterConsent({
        navigation,
        consentParams,
        accountType,
        shouldShowQuestionnaire,
        isMetricsOptedIn: true,
        isBasicFunctionalityEnabled,
        walletSetupAttributionProps,
        dispatch,
        needsQrProvisioning,
        discoverAccountsLogContext: 'OnboardingMarketingConsent',
      });
    },
    [
      accountType,
      consentParams,
      dispatch,
      events,
      isBasicFunctionalityEnabled,
      isSocialLogin,
      metrics,
      navigation,
      needsQrProvisioning,
      shouldShowQuestionnaire,
      walletSetupAttributionProps,
      isMarketingOnByDefault,
    ],
  );

  const handleMarketingToggle = useCallback(() => {
    setIsMarketingChecked((prevValue) => !prevValue);
  }, []);

  const handleContinue = useCallback(() => {
    persistChoice(isMarketingChecked).catch(() => undefined);
  }, [isMarketingChecked, persistChoice]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={OnboardingMarketingConsentSelectorsIDs.SCREEN}
    >
      <HeaderStandard
        includesTopInset
        onBack={handleBack}
        backButtonProps={{
          accessibilityLabel: strings('navigation.back'),
          testID: OnboardingMarketingConsentSelectorsIDs.BACK_BUTTON,
        }}
      />
      <Box twClassName="px-4 pt-4 gap-2">
        <Text
          variant={TextVariant.DisplayMd}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
          testID={OnboardingMarketingConsentSelectorsIDs.TITLE}
        >
          {strings('privacy_policy.checkbox_marketing')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={OnboardingMarketingConsentSelectorsIDs.DESCRIPTION}
        >
          {strings('privacy_policy.checkbox')}
        </Text>
      </Box>
      <ScrollView style={tw.style('flex-1')}>
        <Box
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 justify-center my-6"
        >
          <Image
            source={PrivacyIllustration}
            style={tw.style('self-center', {
              width: illustrationSize.width,
              height: illustrationSize.height,
            })}
            resizeMode="contain"
          />
        </Box>
        <Box twClassName="px-4 pb-4">
          <Pressable
            style={({ pressed }) =>
              tw.style(
                'bg-background-alternative rounded-xl p-4',
                pressed && 'opacity-70',
              )
            }
            onPress={handleMarketingToggle}
            testID={OnboardingMarketingConsentSelectorsIDs.CHECKBOX}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              justifyContent={BoxJustifyContent.Between}
              gap={4}
            >
              <Box twClassName="flex-1">
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('privacy_policy.checkbox_marketing')}
                </Text>
              </Box>
              <Checkbox
                onPress={handleMarketingToggle}
                isChecked={isMarketingChecked}
                accessibilityRole={'checkbox'}
                accessible
              />
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="mt-1"
            >
              {strings('privacy_policy.checkbox')}
            </Text>
          </Pressable>
        </Box>
      </ScrollView>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 py-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleContinue}
          testID={OnboardingMarketingConsentSelectorsIDs.CONTINUE_BUTTON}
          style={tw.style('flex-1')}
        >
          {strings('privacy_policy.continue')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default OnboardingMarketingConsent;
