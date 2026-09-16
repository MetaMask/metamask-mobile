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
import { refresh as refreshEntitlements } from '../../../core/Subscription/entitlementResolution';
import Benefits from './screens/Benefits';
import Success from './screens/Success';
import Routes from '../../../constants/navigation/Routes';
import type { AppStackNavigationProp } from '../../../core/NavigationService/types';
import {
  DEFAULT_PLAN,
  type PlanId,
} from './screens/Benefits/Benefits.constants';
import type { SelectedPlusPlan } from './screens/Benefits/utils/getSelectedPlusPlan';
import { ProSubscriptionTestIds } from './ProSubscription.testIds';

type ProSubscriptionScreen = 'benefits' | 'success';

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
  const [currentScreen, setCurrentScreen] =
    useState<ProSubscriptionScreen>('benefits');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    (route.params?.initialPlan as PlanId | undefined) ?? DEFAULT_PLAN,
  );
  const [checkoutPlan, setCheckoutPlan] = useState<
    SelectedPlusPlan | undefined
  >();

  // Dismiss when the Pro flag is off, and send anyone already entitled to the
  // hub so an existing subscriber never lands on the upsell.
  useEffect(() => {
    if (proAccess === MoneyAccountPlusAccess.Disabled) {
      navigation.goBack();
      return;
    }

    // On the success screen the user has just subscribed, so becoming a
    // subscriber is expected — let them read the confirmation instead of
    // yanking them to the hub.
    if (
      proAccess === MoneyAccountPlusAccess.Subscriber &&
      currentScreen !== 'success'
    ) {
      navigation.replace(Routes.PRO_HUB.ROOT, {
        source: 'pro_subscription_already_subscribed',
      });
    }
  }, [proAccess, currentScreen, navigation]);

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

  const handleSuccess = useCallback((plan: SelectedPlusPlan) => {
    setCheckoutPlan(plan);
    setCurrentScreen('success');
  }, []);

  const shouldRenderFlow =
    proAccess === MoneyAccountPlusAccess.Eligible ||
    currentScreen === 'success';

  const handleSubscriptionOnSuccess = useCallback(async () => {
    // Land on the hub with entitlements that reflect the new subscription
    // rather than the pre-checkout snapshot.
    await refreshEntitlements();
    navigation.replace(Routes.PRO_HUB.ROOT, {
      source: 'pro_subscription_success',
    });
  }, [navigation]);

  let screenContent: React.ReactNode = null;
  if (currentScreen === 'benefits') {
    screenContent = (
      <Benefits
        onSuccess={handleSuccess}
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

      {/* Held back until entitlements resolve so a subscriber never sees a
          flash of the upsell before being redirected to the hub. */}
      {shouldRenderFlow && screenContent}
    </SafeAreaView>
  );
};

export default ProSubscription;
