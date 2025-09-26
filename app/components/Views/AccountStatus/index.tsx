import React, { useEffect, useCallback } from 'react';
import {
  View,
  Image,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import Text from '../../../component-library/components/Texts/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text/Text.types';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import styles from './index.styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { PREVIOUS_SCREEN } from '../../../constants/navigation';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import {
  OnboardingActionTypes,
  saveOnboardingEvent as saveEvent,
} from '../../../actions/onboarding';
import AccountStatusImg from '../../../images/account_status.png';

interface AccountStatusProps {
  type?: 'found' | 'not_exist';
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

interface AccountRouteParams {
  accountName?: string;
  oauthLoginSuccess?: boolean;
  onboardingTraceCtx?: string;
}

const AccountStatus = ({
  type = 'not_exist',
  saveOnboardingEvent,
}: AccountStatusProps) => {
  const navigation = useNavigation();
  const route = useRoute();

  const accountName = (route.params as AccountRouteParams)?.accountName;
  const oauthLoginSuccess = (route.params as AccountRouteParams)
    ?.oauthLoginSuccess;
  const onboardingTraceCtx = (route.params as AccountRouteParams)
    ?.onboardingTraceCtx;

  // check for small screen size
  const isSmallScreen = Dimensions.get('window').width < 375;

  const track = useCallback(
    (event: IMetaMetricsEvent) => {
      trackOnboarding(
        MetricsEventBuilder.createEventBuilder(event).build(),
        saveOnboardingEvent,
      );
    },
    [saveOnboardingEvent],
  );

  useEffect(() => {
    const traceName =
      type === 'found'
        ? TraceName.OnboardingNewSocialAccountExists
        : TraceName.OnboardingExistingSocialAccountNotFound;

    trace({
      name: traceName,
      op: TraceOperation.OnboardingUserJourney,
      tags: getTraceTags(store.getState()),
      parentContext: onboardingTraceCtx,
    });

    track(
      type === 'found'
        ? MetaMetricsEvents.ACCOUNT_ALREADY_EXISTS_PAGE_VIEWED
        : MetaMetricsEvents.ACCOUNT_NOT_FOUND_PAGE_VIEWED,
    );

    return () => {
      endTrace({ name: traceName });
    };
  }, [onboardingTraceCtx, type, track]);

  const navigateNextScreen = (
    targetRoute: string,
    previousScreen: string,
    metricEvent: string,
  ) => {
    const nextScenarioTraceName =
      type === 'found'
        ? TraceName.OnboardingExistingSocialLogin
        : TraceName.OnboardingNewSocialCreateWallet;
    trace({
      name: nextScenarioTraceName,
      op: TraceOperation.OnboardingUserJourney,
      tags: {
        ...getTraceTags(store.getState()),
        source: 'account_status_redirect',
      },
      parentContext: onboardingTraceCtx,
    });

    navigation.dispatch(
      StackActions.replace(targetRoute, {
        [PREVIOUS_SCREEN]: previousScreen,
        oauthLoginSuccess,
        onboardingTraceCtx,
      }),
    );
    track(
      metricEvent === 'import'
        ? MetaMetricsEvents.WALLET_IMPORT_STARTED
        : MetaMetricsEvents.WALLET_SETUP_STARTED,
    );
  };

  return (
    <SafeAreaView>
      <View style={styles.root}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <Text variant={TextVariant.DisplayMD} color={TextColor.Default}>
              {type === 'found'
                ? strings('account_status.account_already_exists')
                : strings('account_status.account_not_found')}
            </Text>
            <Image
              source={AccountStatusImg}
              resizeMode="contain"
              style={styles.walletReadyImage}
            />
            <View style={styles.descriptionWrapper}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings(
                  type === 'found'
                    ? 'account_status.account_already_exists_description'
                    : 'account_status.account_not_found_description',
                  {
                    accountName,
                  },
                )}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            size={isSmallScreen ? ButtonSize.Md : ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={() => {
              if (type === 'found') {
                navigateNextScreen('Rehydrate', 'Onboarding', 'import');
              } else {
                navigateNextScreen('ChoosePassword', 'Onboarding', 'create');
              }
            }}
            label={
              type === 'found'
                ? strings('account_status.log_in')
                : strings('account_status.create_new_wallet')
            }
          />
          <Button
            variant={ButtonVariants.Secondary}
            size={isSmallScreen ? ButtonSize.Md : ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={() => {
              navigation.goBack();
            }}
            label={strings('account_status.use_different_login_method')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(AccountStatus);
