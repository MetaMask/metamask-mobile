import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  BackHandler,
  Alert,
  TouchableOpacity,
  Platform,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { clearOnboardingEvents } from '../../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { OPTIN_META_METRICS_UI_SEEN, TRUE } from '../../../constants/storage';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import StorageWrapper from '../../../store/storage-wrapper';
import { useTheme } from '../../../util/theme';
import { MetaMetricsOptInSelectorsIDs } from './MetaMetricsOptIn.testIds';
import Checkbox from '../../../component-library/components/Checkbox';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Routes from '../../../constants/navigation/Routes';
import generateDeviceAnalyticsMetaData, {
  UserSettingsAnalyticsMetaData as generateUserSettingsAnalyticsMetaData,
} from '../../../util/metrics';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { getConfiguredCaipChainIds } from '../../../util/metrics/MultichainAPI/networkMetricUtils';
import {
  updateCachedConsent,
  flushBufferedTraces,
  discardBufferedTraces,
} from '../../../util/trace';
import { setupSentry } from '../../../util/sentry/utils';
import PrivacyIllustration from '../../../images/privacy_metrics_illustration.png';
import { selectIsPna25FlagEnabled } from '../../../selectors/featureFlagController/legalNotices';
import createStyles from './OptinMetrics.styles';
import type { OptinMetricsRouteParams } from './OptinMetrics.types';
import {
  useNavigation,
  useRoute,
  type RouteProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootState } from '../../../reducers';

/**
 * View that is displayed in the flow to agree to metrics
 */
const OptinMetrics = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route =
    useRoute<
      RouteProp<
        ParamListBase & { OptinMetrics: OptinMetricsRouteParams },
        'OptinMetrics'
      >
    >();
  const { colors } = useTheme();
  const metrics = useMetrics();

  // Redux state selectors
  const events = useSelector((state: RootState) => state.onboarding.events);
  const isPna25FlagEnabled = useSelector(selectIsPna25FlagEnabled);

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

  const styles = createStyles(colors);

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
  const continueNavigation = useCallback(async () => {
    await StorageWrapper.setItem(OPTIN_META_METRICS_UI_SEEN, TRUE);

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

    // Track the analytics preference event first
    metrics.trackEvent(
      metrics
        .createEventBuilder(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED)
        .addProperties({
          [UserProfileProperty.HAS_MARKETING_CONSENT]:
            Boolean(isMarketingChecked),
          is_metrics_opted_in: isBasicUsageChecked,
          location: 'onboarding_metametrics',
          updated_after_onboarding: false,
        })
        .build(),
    );

    await metrics.addTraitsToUser({
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
          metrics.trackEvent(...eventArgs);
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
        url: 'https://support.metamask.io/configure/privacy/how-to-manage-your-metametrics-settings/',
        title: 'How to manage your MetaMetrics settings',
      }),
    [onPressLink],
  );

  const handleBasicUsageToggle = useCallback(() => {
    setIsBasicUsageChecked((prev) => {
      const newValue = !prev;
      // If unchecking basic usage, also uncheck marketing
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
      <View style={styles.actionContainer}>
        <Button
          variant={ButtonVariants.Primary}
          onPress={onConfirm}
          testID={MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_CONTINUE_BUTTON_ID}
          style={styles.button}
          label={strings('privacy_policy.continue')}
          size={ButtonSize.Lg}
        />
      </View>
    ),
    [styles, onConfirm],
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

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.root}>
      <ScrollView
        style={styles.root}
        scrollEventThrottle={150}
        onContentSizeChange={onContentSizeChange}
        onLayout={onLayout}
        onScroll={onScroll}
        testID={MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID}
      >
        <View style={styles.wrapper}>
          <View style={styles.imageContainer}>
            <Image
              source={PrivacyIllustration}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>
          <Text
            variant={TextVariant.DisplayMD}
            color={TextColor.Default}
            style={styles.title}
            testID={MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_TITLE_ID}
          >
            {strings('privacy_policy.description_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            testID={
              MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID
            }
          >
            {strings('privacy_policy.description_content_1')}
          </Text>
          <View>
            <TouchableOpacity
              style={styles.sectionContainer}
              onPress={handleBasicUsageToggle}
              testID={
                MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_METRICS_CHECKBOX
              }
              activeOpacity={0.7}
            >
              <View style={styles.checkbox}>
                <View style={styles.flexContainer}>
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={TextColor.Default}
                  >
                    {strings('privacy_policy.gather_basic_usage_title')}
                  </Text>
                </View>
                <Checkbox
                  onPress={handleBasicUsageToggle}
                  isChecked={isBasicUsageChecked}
                  accessibilityRole={'checkbox'}
                  accessible
                />
              </View>
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Alternative}
                style={styles.descriptionText}
              >
                {isPna25FlagEnabled
                  ? strings(
                      'privacy_policy.gather_basic_usage_description_updated',
                    ) + ' '
                  : strings('privacy_policy.gather_basic_usage_description') +
                    ' '}
                <Text
                  color={TextColor.Primary}
                  variant={TextVariant.BodySM}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    openLearnMore();
                  }}
                >
                  {strings('privacy_policy.gather_basic_usage_learn_more')}
                </Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sectionContainer,
                isMarketingDisabled && styles.disabledContainer,
              ]}
              onPress={handleMarketingToggle}
              activeOpacity={isMarketingDisabled ? 1 : 0.7}
              disabled={isMarketingDisabled}
            >
              <View style={styles.checkbox}>
                <View style={styles.flexContainer}>
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={
                      isMarketingDisabled ? TextColor.Muted : TextColor.Default
                    }
                  >
                    {strings('privacy_policy.checkbox_marketing')}
                  </Text>
                </View>
                <Checkbox
                  onPress={handleMarketingToggle}
                  isChecked={isMarketingChecked}
                  accessibilityRole={'checkbox'}
                  accessible
                  disabled={isMarketingDisabled}
                />
              </View>
              <Text
                variant={TextVariant.BodySM}
                color={
                  isMarketingDisabled ? TextColor.Muted : TextColor.Alternative
                }
                style={styles.descriptionText}
              >
                {strings('privacy_policy.checkbox')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {renderActionButtons()}
    </SafeAreaView>
  );
};

OptinMetrics.navigationOptions = {
  headerShown: false,
};

export default OptinMetrics;
