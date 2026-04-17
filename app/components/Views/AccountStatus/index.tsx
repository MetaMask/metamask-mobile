import React, { useEffect, useCallback, useMemo } from 'react';
import { Image, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import {
  StackActions,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import { AccountStatusSelectorIDs } from './AccountStatus.testIds';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { PREVIOUS_SCREEN } from '../../../constants/navigation';
import Routes from '../../../constants/navigation/Routes';
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
import type { AccountStatusParams } from './types';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const IMAGE_MAX_WIDTH = 343;
const IMAGE_ASPECT_RATIO = 343 / 302;
const HORIZONTAL_PADDING = 16;

const ACCOUNT_STATUS_PRIMARY_FLOW = {
  EXISTING_ACCOUNT_IMPORT: 'import',
  NEW_ACCOUNT_CREATE: 'create',
} as const;

type AccountStatusPrimaryFlowMetric =
  (typeof ACCOUNT_STATUS_PRIMARY_FLOW)[keyof typeof ACCOUNT_STATUS_PRIMARY_FLOW];

interface AccountStatusRouteParams {
  AccountStatus: AccountStatusParams;
  AccountAlreadyExists: AccountStatusParams;
  AccountNotFound: AccountStatusParams;
  [key: string]: object | undefined;
}

interface AccountStatusProps {
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

const AccountStatus = ({ saveOnboardingEvent }: AccountStatusProps) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const route =
    useRoute<
      RouteProp<
        AccountStatusRouteParams,
        'AccountStatus' | 'AccountAlreadyExists' | 'AccountNotFound'
      >
    >();

  const {
    type = 'not_exist',
    accountName,
    oauthLoginSuccess,
    onboardingTraceCtx,
    provider,
  } = route?.params ?? {};

  const isSmallScreen = windowWidth < 375;

  const imageLayout = useMemo(() => {
    const containerWidth = windowWidth - HORIZONTAL_PADDING * 2;
    const walletImageWidth = Math.min(containerWidth, IMAGE_MAX_WIDTH);
    return {
      width: walletImageWidth,
      height: Math.round(walletImageWidth / IMAGE_ASPECT_RATIO),
    };
  }, [windowWidth]);

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
    metricFlow: AccountStatusPrimaryFlowMetric,
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
        provider,
      }),
    );
    track(
      metricFlow === ACCOUNT_STATUS_PRIMARY_FLOW.EXISTING_ACCOUNT_IMPORT
        ? MetaMetricsEvents.WALLET_IMPORT_STARTED
        : MetaMetricsEvents.WALLET_SETUP_STARTED,
    );
  };

  const descriptionForFoundTypeAccountStatus = useCallback(() => {
    if (Platform.OS === 'ios') {
      return 'account_status.account_already_exists_ios_new_user_description';
    }
    return 'account_status.account_already_exists_description';
  }, []);

  const buttonLabelForFoundTypeAccountStatus = useCallback(() => {
    if (Platform.OS === 'ios') {
      return 'account_status.unlock_wallet';
    }
    return 'account_status.log_in';
  }, []);

  const footerBottomClass =
    Platform.OS === 'ios' ? 'mb-4 mt-auto gap-4' : 'mb-6 mt-auto gap-4';

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={
        type === 'found'
          ? AccountStatusSelectorIDs.ACCOUNT_FOUND_CONTAINER
          : AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CONTAINER
      }
    >
      <Box twClassName="flex-1 px-4 pt-4">
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('grow')}
        >
          <Box
            alignItems={BoxAlignItems.Start}
            justifyContent={BoxJustifyContent.Start}
            twClassName="flex-1 pb-6"
          >
            <Text
              variant={TextVariant.DisplayMd}
              color={TextColor.TextDefault}
              testID={
                type === 'found'
                  ? AccountStatusSelectorIDs.ACCOUNT_FOUND_TITLE
                  : AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_TITLE
              }
            >
              {type === 'found'
                ? strings('account_status.account_already_exists')
                : strings('account_status.account_not_found')}
            </Text>
            <Image
              source={AccountStatusImg}
              resizeMode="contain"
              style={tw.style('my-4 self-center', imageLayout)}
            />
            <Box twClassName="w-full gap-5">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings(
                  type === 'found'
                    ? descriptionForFoundTypeAccountStatus()
                    : 'account_status.account_not_found_description',
                  {
                    accountName,
                  },
                )}
              </Text>
            </Box>
          </Box>
        </ScrollView>

        <Box twClassName={footerBottomClass}>
          <Button
            variant={ButtonVariant.Primary}
            size={isSmallScreen ? ButtonSize.Md : ButtonSize.Lg}
            isFullWidth
            onPress={() => {
              if (type === 'found') {
                navigateNextScreen(
                  Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE,
                  Routes.ONBOARDING.ONBOARDING,
                  ACCOUNT_STATUS_PRIMARY_FLOW.EXISTING_ACCOUNT_IMPORT,
                );
              } else {
                navigateNextScreen(
                  Routes.ONBOARDING.CHOOSE_PASSWORD,
                  Routes.ONBOARDING.ONBOARDING,
                  ACCOUNT_STATUS_PRIMARY_FLOW.NEW_ACCOUNT_CREATE,
                );
              }
            }}
            testID={
              type === 'found'
                ? AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON
                : AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CREATE_BUTTON
            }
          >
            {type === 'found'
              ? strings(buttonLabelForFoundTypeAccountStatus())
              : strings('account_status.create_new_wallet')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={isSmallScreen ? ButtonSize.Md : ButtonSize.Lg}
            isFullWidth
            onPress={() => {
              navigation.goBack();
            }}
            testID={
              type === 'found'
                ? AccountStatusSelectorIDs.ACCOUNT_FOUND_DIFFERENT_METHOD_BUTTON
                : AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_DIFFERENT_METHOD_BUTTON
            }
          >
            {strings('account_status.use_different_login_method')}
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(AccountStatus);
