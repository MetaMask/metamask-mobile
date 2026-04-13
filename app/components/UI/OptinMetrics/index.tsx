import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ScrollView,
  BackHandler,
  Alert,
  Pressable,
  Platform,
  Image,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  Button,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { clearOnboardingEvents } from '../../../actions/onboarding';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { markMetricsOptInUISeen } from '../../../util/metrics/metricsOptInUIUtils';
import { MetaMetricsOptInSelectorsIDs } from './MetaMetricsOptIn.testIds';
import Checkbox from '../../../component-library/components/Checkbox';
import Routes from '../../../constants/navigation/Routes';
import generateDeviceAnalyticsMetaData, {
  UserSettingsAnalyticsMetaData as generateUserSettingsAnalyticsMetaData,
} from '../../../util/metrics';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { getConfiguredCaipChainIds } from '../../../util/metrics/MultichainAPI/networkMetricUtils';
import {
  updateCachedConsent,
  flushBufferedTraces,
  discardBufferedTraces,
} from '../../../util/trace';
import { setupSentry } from '../../../util/sentry/utils';
import PrivacyIllustration from '../../../images/privacy_metrics_illustration.png';
import { selectIsPna25FlagEnabled } from '../../../selectors/featureFlagController/legalNotices';
import Device from '../../../util/device';
import { HOW_TO_MANAGE_METRAMETRICS_SETTINGS } from '../../../constants/urls';
import type { OptinMetricsRouteParams } from './OptinMetrics.types';
import {
  useNavigation,
  useRoute,
  type RouteProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { RootState } from '../../../reducers';

/**
 * View that is displayed in the flow to agree to metrics
 */
const OptinMetrics = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<
        ParamListBase & { OptinMetrics: OptinMetricsRouteParams },
        'OptinMetrics'
      >
    >();
  const tw = useTailwind();
  const metrics = useAnalytics();

  // Redux state selectors
  const events = useSelector((state: RootState) => state.onboarding.events);
  const isPna25FlagEnabled = useSelector(selectIsPna25FlagEnabled);
  const reduxAccountType = useSelector(selectOnboardingAccountType);

  // State
  const [scrollViewContentHeight, setScrollViewContentHeight] = useState<
    number | undefined
  >(undefined);
  const [isEndReached, setIsEndReached] = useState(false);
  const [scrollViewHeight, setScrollViewHeight] = useState<number | undefined>(
    undefined,
  );
  const [isMarketingChecked, setIsMarketingChecked] = useState(false);
  const [isBasicUsageChecked, setIsBasicUsageChecked] = useState(true);

  const isMediumDevice = useMemo(() => Device.isMediumDevice(), []);
  const illustrationSize = useMemo(
    () =>
      isMediumDevice
        ? { width: 160, height: 120 }
        : { width: 200, height: 180 },
    [isMediumDevice],
  );

  /**
   * Temporary disabling the back button so users can't go back
   */
  const handleBackPress = useCallback(() => {
    Alert.alert(
      strings('onboarding.optin_back_title'),
      strings('onboarding.optin_back_desc'),
    );
    return true;
  }, []);

  // Component lifecycle effects
  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [handleBackPress]);

  // Check if content fits viewport when dimensions change
  useEffect(() => {
    if (scrollViewContentHeight === undefined) return;

    // Check if content fits view port of scroll view
    if (
      scrollViewHeight &&
      scrollViewHeight >= scrollViewContentHeight &&
      !isEndReached
    ) {
      setIsEndReached(true);
    }
  }, [scrollViewContentHeight, scrollViewHeight, isEndReached]);

  /**
   * Action to be triggered when pressing any button
   */
  const accountType = route?.params?.accountType ?? reduxAccountType;

  const continueNavigation = useCallback(async () => {
    await markMetricsOptInUISeen();

    const onContinue = route?.params?.onContinue as (() => void) | undefined;
    if (onContinue) {
      return onContinue();
    }

    navigation.reset({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
  }, [navigation, route?.params]);

  /**
   * Callback on press confirm
   */
  const onConfirm = useCallback(async () => {
    await metrics.enable(isBasicUsageChecked);
    await setupSentry(); // enabled/disabled depend on the isBasicUsageChecked

    if (isBasicUsageChecked) {
      await flushBufferedTraces();
    } else {
      discardBufferedTraces();
    }
    updateCachedConsent(isBasicUsageChecked);

    dispatch(setDataCollectionForMarketing(isMarketingChecked));

    // Track opt-in / opt-out for metrics
    metrics.trackEvent(
      metrics
        .createEventBuilder(
          isBasicUsageChecked
            ? MetaMetricsEvents.METRICS_OPT_IN
            : MetaMetricsEvents.METRICS_OPT_OUT,
        )
        .addProperties({
          updated_after_onboarding: false,
          location: 'onboarding_metametrics',
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );

    metrics.trackEvent(
      metrics
        .createEventBuilder(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED)
        .addProperties({
          [UserProfileProperty.HAS_MARKETING_CONSENT]:
            Boolean(isMarketingChecked),
          is_metrics_opted_in: isBasicUsageChecked,
          location: 'onboarding_metametrics',
          updated_after_onboarding: false,
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );

    await metrics.identify({
      ...generateDeviceAnalyticsMetaData(),
      ...generateUserSettingsAnalyticsMetaData(),
      [UserProfileProperty.CHAIN_IDS]: getConfiguredCaipChainIds(),
    });

    // track onboarding events that were stored before user opted in
    // only if the user eventually opts in.
    if (events?.length) {
      let delay = 0; // Initialize delay
      const eventTrackingDelay = 200; // ms delay between each event
      events.forEach((eventArgs) => {
        // delay each event to prevent them from
        // being tracked with the same timestamp
        // which would cause them to be grouped together
        // by sentAt time in the Segment dashboard
        // as precision is only to the milisecond
        // and loop seems to runs faster than that
        setTimeout(() => {
          const event = AnalyticsEventBuilder.createEventBuilder(
            eventArgs[0],
          ).build();
          metrics.trackEvent(event);
        }, delay);
        delay += eventTrackingDelay;
      });
    }
    dispatch(clearOnboardingEvents());
    continueNavigation();
  }, [
    isBasicUsageChecked,
    isMarketingChecked,
    events,
    metrics,
    dispatch,
    continueNavigation,
    accountType,
  ]);

  /**
   * Opens link when provided link params.
   *
   * @param {Object} linkParams
   * @param {string} linkParams.url
   * @param {string} linkParams.title
   */
  const onPressLink = useCallback(
    (linkParams: { url: string; title: string }) => {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: linkParams,
      });
    },
    [navigation],
  );

  const openLearnMore = useCallback(
    () =>
      onPressLink({
        url: HOW_TO_MANAGE_METRAMETRICS_SETTINGS,
        title: 'How to manage your MetaMetrics settings',
      }),
    [onPressLink],
  );

  const handleBasicUsageToggle = useCallback(() => {
    setIsBasicUsageChecked((prevValue) => {
      const newValue = !prevValue;
      if (!newValue) {
        setIsMarketingChecked(false);
      }
      return newValue;
    });
  }, []);

  const handleMarketingToggle = useCallback(() => {
    if (isBasicUsageChecked) {
      setIsMarketingChecked((prev) => !prev);
    }
  }, [isBasicUsageChecked]);

  const isMarketingDisabled = !isBasicUsageChecked;

  const renderActionButtons = useCallback(
    () => (
      <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 py-2">
        <Button
          variant={ButtonVariant.Primary}
          onPress={onConfirm}
          testID={MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID}
          style={tw.style('flex-1')}
          size={ButtonSize.Lg}
        >
          {strings('privacy_policy.continue')}
        </Button>
      </Box>
    ),
    [onConfirm, tw],
  );

  /**
   * Content size change event for the ScrollView.
   *
   * @param {number} _
   * @param {number} height
   */
  const onContentSizeChange = useCallback(
    (_: number, height: number) => setScrollViewContentHeight(height),
    [],
  );

  /**
   * Layout event for the ScrollView.
   *
   * @param {Object} event
   */
  const onLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    const height = nativeEvent.layout.height;
    setScrollViewHeight(height);
  }, []);

  /**
   * Scroll event for the ScrollView.
   *
   * @param {Object} event
   */
  const onScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentYOffset = nativeEvent.contentOffset.y;
      const paddingAllowance = Platform.select({
        ios: 16,
        android: 32,
      });
      const endThreshold =
        nativeEvent.contentSize.height -
        nativeEvent.layoutMeasurement.height -
        (paddingAllowance || 16);

      // Check when scroll has reached the end.
      if (currentYOffset >= endThreshold && !isEndReached) {
        setIsEndReached(true);
      }
    },
    [isEndReached],
  );

  const rootStyle = useMemo(
    () =>
      tw.style('flex-1 bg-default', {
        paddingTop:
          Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 40,
      }),
    [tw],
  );

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={rootStyle}>
      <ScrollView
        style={tw.style('flex-1')}
        scrollEventThrottle={150}
        onContentSizeChange={onContentSizeChange}
        onLayout={onLayout}
        onScroll={onScroll}
        testID={MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID}
      >
        <Box twClassName="mx-5 flex-1 gap-y-4 pb-20">
          <Box
            alignItems={BoxAlignItems.Center}
            twClassName={isMediumDevice ? 'my-2' : 'my-3'}
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
          <Text
            variant={TextVariant.DisplayMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Bold}
            twClassName="mt-2"
            testID={MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_TITLE_ID}
          >
            {strings('privacy_policy.description_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={
              MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID
            }
          >
            {strings('privacy_policy.description_content_1')}
          </Text>
          <Box>
            <Pressable
              style={({ pressed }) =>
                tw.style(
                  'bg-background-alternative rounded-xl p-4 mb-4',
                  pressed && 'opacity-70',
                )
              }
              onPress={handleBasicUsageToggle}
              testID={
                MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_METRICS_CHECKBOX
              }
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
                    {strings('privacy_policy.gather_basic_usage_title')}
                  </Text>
                </Box>
                <Checkbox
                  onPress={handleBasicUsageToggle}
                  isChecked={isBasicUsageChecked}
                  accessibilityRole={'checkbox'}
                  accessible
                />
              </Box>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                twClassName="mt-1"
              >
                {isPna25FlagEnabled
                  ? strings(
                      'privacy_policy.gather_basic_usage_description_updated',
                    ) + ' '
                  : strings('privacy_policy.gather_basic_usage_description') +
                    ' '}
                <Text
                  color={TextColor.PrimaryDefault}
                  variant={TextVariant.BodySm}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    openLearnMore();
                  }}
                >
                  {strings('privacy_policy.gather_basic_usage_learn_more')}
                </Text>
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) =>
                tw.style(
                  'bg-background-alternative rounded-xl p-4 mb-4',
                  isMarketingDisabled && 'opacity-50',
                  pressed && !isMarketingDisabled && 'opacity-70',
                )
              }
              onPress={handleMarketingToggle}
              disabled={isMarketingDisabled}
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
                    color={
                      isMarketingDisabled
                        ? TextColor.TextMuted
                        : TextColor.TextDefault
                    }
                  >
                    {strings('privacy_policy.checkbox_marketing')}
                  </Text>
                </Box>
                <Checkbox
                  onPress={handleMarketingToggle}
                  isChecked={isMarketingChecked}
                  accessibilityRole={'checkbox'}
                  accessible
                  disabled={isMarketingDisabled}
                />
              </Box>
              <Text
                variant={TextVariant.BodySm}
                color={
                  isMarketingDisabled
                    ? TextColor.TextMuted
                    : TextColor.TextAlternative
                }
                twClassName="mt-1"
              >
                {strings('privacy_policy.checkbox')}
              </Text>
            </Pressable>
          </Box>
        </Box>
      </ScrollView>
      {renderActionButtons()}
    </SafeAreaView>
  );
};

OptinMetrics.navigationOptions = {
  headerShown: false,
};

export default OptinMetrics;
