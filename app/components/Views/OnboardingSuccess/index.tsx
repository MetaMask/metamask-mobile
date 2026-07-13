import React, { useCallback, useLayoutEffect } from 'react';
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
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectWalletSetupCompletedAttributionAnalyticsProps } from '../../../selectors/attribution';
import { selectQrSyncNeedsProvisioning } from '../../../selectors/qrSyncController';
import { finalizeOnboardingCompletion } from '../../../util/onboarding/finalizeOnboardingCompletion';
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

  const handleOnDone = useCallback(() => {
    finalizeOnboardingCompletion({
      successFlow,
      accountType,
      isBasicFunctionalityEnabled,
      walletSetupAttributionProps,
      dispatch,
      discoverAccountsLogContext: 'OnboardingSuccess',
      needsQrProvisioning,
    });

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
