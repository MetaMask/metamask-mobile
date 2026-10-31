import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from '../../../hooks/useMoneyAccountPlusAccess';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import { ensureError } from '../../../util/errorUtils';
import Benefits from './screens/Benefits';
import Success from './screens/Success';
import type { AppStackNavigationProp } from '../../../core/NavigationService/types';
import {
  DEFAULT_PLAN,
  type PlanId,
} from './screens/Benefits/Benefits.constants';
import type { SelectedPlusPlan } from './screens/Benefits/utils/getSelectedPlusPlan';
import { useProSubscriptionPaymentToasts } from './hooks/useProSubscriptionPaymentToasts';
import { ProSubscriptionTestIds } from './ProSubscription.testIds';
import { openProHubFromSubscriptionModal } from './utils/openProHubFromSubscriptionModal';

const ProSubscriptionScreen = {
  Benefits: 'benefits',
  Success: 'success',
} as const;

type ProSubscriptionScreen =
  (typeof ProSubscriptionScreen)[keyof typeof ProSubscriptionScreen];

const ProSubscription = () => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const tw = useTailwind();
  const route =
    useRoute<
      RouteProp<
        { ProSubscription: { source?: string; initialPlan?: string } },
        'ProSubscription'
      >
    >();

  const proAccess = useMoneyAccountPlusAccess();
  const [currentScreen, setCurrentScreen] = useState<ProSubscriptionScreen>(
    ProSubscriptionScreen.Benefits,
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    (route.params?.initialPlan as PlanId | undefined) ?? DEFAULT_PLAN,
  );
  const [checkoutPlan, setCheckoutPlan] = useState<
    SelectedPlusPlan | undefined
  >();
  const [isCheckoutInProgress, setIsCheckoutInProgress] = useState(false);
  const { showProcessingToast } = useProSubscriptionPaymentToasts();

  // Dismiss when the Pro flag is off, and send anyone already entitled to the
  // hub so an existing subscriber never lands on the upsell.
  useEffect(() => {
    if (proAccess === MoneyAccountPlusAccess.Disabled) {
      navigation.goBack();
      return;
    }

    // Checkout refreshes subscriptions before it resolves, so the user can
    // become a subscriber while Benefits is still mounted. Keep this screen
    // up until Success is showing.
    if (
      proAccess === MoneyAccountPlusAccess.Subscriber &&
      currentScreen !== ProSubscriptionScreen.Success &&
      !isCheckoutInProgress
    ) {
      navigation.dispatch(openProHubFromSubscriptionModal);
    }
  }, [proAccess, currentScreen, isCheckoutInProgress, navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePlanChange = useCallback(
    (planId: PlanId) => {
      setSelectedPlan(planId);
      navigation.setParams({ initialPlan: planId });
    },
    [navigation],
  );

  const handleCheckoutStart = useCallback(() => {
    setIsCheckoutInProgress(true);
  }, []);

  const handleCheckoutError = useCallback(() => {
    setIsCheckoutInProgress(false);
  }, []);

  const handleSuccess = useCallback((plan: SelectedPlusPlan) => {
    setCheckoutPlan(plan);
    setCurrentScreen(ProSubscriptionScreen.Success);
  }, []);

  const handleProcessing = useCallback(() => {
    showProcessingToast();
    navigation.dispatch(openProHubFromSubscriptionModal);
  }, [navigation, showProcessingToast]);

  const handleSubscriptionOnSuccess = useCallback(async () => {
    // Card checkout completes outside the controller, so wait for canonical
    // state before opening the hub. Stay on success if the refresh fails:
    // Pro Hub would otherwise treat empty state as non-subscriber and bounce.
    try {
      await Engine.context.SubscriptionController.getSubscriptions();
    } catch (error) {
      Logger.error(ensureError(error, 'ProSubscription.refreshSubscriptions'), {
        tags: {
          feature: 'money_account_plus',
          operation: 'refresh_subscriptions_after_checkout',
        },
      });
      return;
    }
    navigation.dispatch(openProHubFromSubscriptionModal);
  }, [navigation]);

  let screenContent: React.ReactNode = null;
  if (currentScreen === ProSubscriptionScreen.Benefits) {
    screenContent = (
      <Benefits
        onSuccess={handleSuccess}
        onProcessing={handleProcessing}
        onCheckoutStart={handleCheckoutStart}
        onCheckoutError={handleCheckoutError}
        onPlanChange={handlePlanChange}
        initialPlan={selectedPlan}
      />
    );
  } else if (checkoutPlan) {
    screenContent = <Success onSuccess={handleSubscriptionOnSuccess} />;
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
    >
      {/* Shared close button — sits above both Benefits and Success screens */}
      <Box twClassName="px-4 pt-4 pb-8 flex-row items-center justify-end">
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={handleClose}
          testID={ProSubscriptionTestIds.CLOSE_BUTTON}
        />
      </Box>

      {(proAccess === MoneyAccountPlusAccess.Eligible ||
        currentScreen === ProSubscriptionScreen.Success ||
        isCheckoutInProgress) &&
        screenContent}
    </SafeAreaView>
  );
};

export default ProSubscription;
