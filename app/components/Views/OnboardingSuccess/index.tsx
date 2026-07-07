import React, { useCallback, useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CommonActions,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { OnboardingSuccessSelectorIDs } from './OnboardingSuccess.testIds';

import OnboardingSuccessEndAnimation from './OnboardingSuccessEndAnimation/index';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import {
  saveOnboardingEvent as saveEvent,
  setWalletHomeOnboardingStepsEligible,
} from '../../../actions/onboarding';
import { shouldMarkWalletHomeOnboardingStepsEligible } from '../../../util/onboarding/walletHomeOnboardingStepsEligibility';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { getOnboardingCompletedAnalyticsPropsFromSuccessFlow } from '../../../util/analytics/onboardingCompletedAnalytics';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectWalletSetupCompletedAttributionAnalyticsProps } from '../../../selectors/attribution';
import { clearAttribution } from '../../../core/redux/slices/attribution';

import Engine from '../../../core/Engine/Engine';
import { discoverAccounts } from '../../../multichain-accounts/discovery';
import Logger from '../../../util/Logger';
import { selectQrSyncNeedsProvisioning } from '../../../selectors/qrSyncController';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontFamily,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export const ResetNavigationToHome = CommonActions.reset({
  index: 0,
  routes: [{ name: 'HomeNav' }],
});

interface OnboardingSuccessRouteParams {
  successFlow?: ONBOARDING_SUCCESS_FLOW;
}

interface OnboardingSuccessParamList {
  OnboardingSuccess: OnboardingSuccessRouteParams;
  [key: string]: object | undefined;
}

interface OnboardingSuccessProps {
  onDone: () => void;
  successFlow: ONBOARDING_SUCCESS_FLOW;
}

export const OnboardingSuccessComponent: React.FC<OnboardingSuccessProps> = ({
  onDone,
  successFlow,
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const accountType = useSelector(selectOnboardingAccountType);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const walletSetupAttributionProps = useSelector(
    selectWalletSetupCompletedAttributionAnalyticsProps,
  );
  const needsQrProvisioning = useSelector(selectQrSyncNeedsProvisioning);

  const tw = useTailwind();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const goToDefaultSettings = () => {
    navigation.navigate(Routes.ONBOARDING.DEFAULT_SETTINGS);
  };

  const runDiscoverAccounts = useCallback(async () => {
    try {
      await discoverAccounts(
        Engine.context.KeyringController.state.keyrings[0].metadata.id,
      );
    } catch (error) {
      Logger.error(
        error as Error,
        'OnboardingSuccess: discoverAccounts failed',
      );
    }
  }, []);

  const runQrProvisioning = useCallback(async () => {
    const { QrSyncProvisioningService } = Engine.context;

    if (!QrSyncProvisioningService) {
      Logger.error(
        new Error('QR sync provisioning service is unavailable'),
        'OnboardingSuccess: provisionFromMetadata failed',
      );
      return;
    }

    try {
      await QrSyncProvisioningService.provisionFromMetadata();
    } catch (error) {
      Logger.error(
        error as Error,
        'OnboardingSuccess: provisionFromMetadata failed',
      );
    }
  }, []);

  const handleOnDone = useCallback(() => {
    if (shouldMarkWalletHomeOnboardingStepsEligible(successFlow)) {
      const onboardingCompletedProperties =
        getOnboardingCompletedAnalyticsPropsFromSuccessFlow(successFlow, {
          accountType,
          isBasicFunctionalityEnabled,
        });

      trackOnboarding(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.ONBOARDING_COMPLETED,
        )
          .addProperties({
            ...onboardingCompletedProperties,
            ...walletSetupAttributionProps,
          })
          .build(),
        (event) => dispatch(saveEvent([event])),
      );

      dispatch(
        setWalletHomeOnboardingStepsEligible(true, {
          skipInitialBalanceWait: true,
        }),
      );
    }

    dispatch(clearAttribution());

    if (needsQrProvisioning) {
      void runQrProvisioning();
    } else {
      void runDiscoverAccounts();
    }
    queueMicrotask(() => {
      onDone();
    });
  }, [
    accountType,
    dispatch,
    isBasicFunctionalityEnabled,
    needsQrProvisioning,
    onDone,
    successFlow,
    walletSetupAttributionProps,
    runDiscoverAccounts,
    runQrProvisioning,
  ]);

  const getTitleString = () => {
    if (successFlow === ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP) {
      return strings('onboarding_success.title');
    }
    return strings('onboarding_success.wallet_ready');
  };

  const renderContent = () => (
    <>
      <OnboardingSuccessEndAnimation
        onAnimationComplete={() => {
          // No-op: Animation completion not needed in success mode
        }}
      />
      <Text
        variant={TextVariant.DisplayMd}
        fontFamily={FontFamily.Accent}
        fontWeight={FontWeight.Regular}
        style={tw.style('mt-6 mb-4 mx-4 text-center', {
          fontWeight: '400',
        })}
      >
        {getTitleString()}
      </Text>
    </>
  );

  const renderFooter = () => {
    if (successFlow === ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP) {
      return null;
    }

    return (
      <Button
        onPress={goToDefaultSettings}
        testID={OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON}
        variant={ButtonVariant.Tertiary}
        size={ButtonSize.Lg}
        isFullWidth
      >
        {strings('onboarding_success.manage_default_settings')}
      </Button>
    );
  };

  return (
    <Box twClassName="flex-1 bg-default">
      <Box
        twClassName="flex-1 px-4"
        testID={OnboardingSuccessSelectorIDs.CONTAINER_ID}
      >
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1"
        >
          {renderContent()}
        </Box>

        <SafeAreaView
          edges={['top', 'left', 'right', 'bottom']}
          style={tw.style('items-center pb-1 gap-y-3')}
        >
          <Button
            testID={OnboardingSuccessSelectorIDs.DONE_BUTTON}
            variant={ButtonVariant.Primary}
            onPress={handleOnDone}
            size={ButtonSize.Lg}
            isFullWidth
          >
            {strings('onboarding_success.done')}
          </Button>
          {renderFooter()}
        </SafeAreaView>
      </Box>
    </Box>
  );
};

export const OnboardingSuccess = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<OnboardingSuccessParamList, 'OnboardingSuccess'>>();
  const successFlow =
    route?.params?.successFlow ?? ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP;
  const nextScreen = ResetNavigationToHome;

  return (
    <OnboardingSuccessComponent
      successFlow={successFlow}
      onDone={() => navigation.dispatch(nextScreen)}
    />
  );
};

export default OnboardingSuccess;
