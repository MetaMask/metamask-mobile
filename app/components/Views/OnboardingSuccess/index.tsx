import React, { useLayoutEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CommonActions,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectWalletSetupCompletedAttributionAnalyticsProps } from '../../../selectors/attribution';
import { selectQrSyncNeedsProvisioning } from '../../../selectors/qrSyncController';
import { finalizeOnboardingCompletion } from '../../../util/onboarding/finalizeOnboardingCompletion';
import type { AppNavigationProp } from '../../../core/NavigationService/types';

export const ResetNavigationToHome = CommonActions.reset({
  index: 0,
  routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
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
  const dispatch = useDispatch();
  const hasCompleted = useRef(false);
  const accountType = useSelector(selectOnboardingAccountType);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const walletSetupAttributionProps = useSelector(
    selectWalletSetupCompletedAttributionAnalyticsProps,
  );
  const needsQrProvisioning = useSelector(selectQrSyncNeedsProvisioning);

  useLayoutEffect(() => {
    if (hasCompleted.current) {
      return;
    }
    hasCompleted.current = true;

    finalizeOnboardingCompletion({
      successFlow,
      accountType,
      isBasicFunctionalityEnabled,
      walletSetupAttributionProps,
      dispatch,
      discoverAccountsLogContext: 'OnboardingSuccess',
      needsQrProvisioning,
    });

    onDone();
  }, [
    accountType,
    dispatch,
    isBasicFunctionalityEnabled,
    needsQrProvisioning,
    onDone,
    successFlow,
    walletSetupAttributionProps,
  ]);

  return null;
};

export const OnboardingSuccess = () => {
  const navigation = useNavigation<AppNavigationProp>();
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
