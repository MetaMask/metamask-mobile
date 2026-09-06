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
import { useProSubscriptionEnabled } from '../../../hooks/useProSubscriptionEnabled';
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

  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const [currentScreen, setCurrentScreen] =
    useState<ProSubscriptionScreen>('benefits');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    (route.params?.initialPlan as PlanId | undefined) ?? DEFAULT_PLAN,
  );
  const [checkoutPlan, setCheckoutPlan] = useState<
    SelectedPlusPlan | undefined
  >();

  // Guard: dismiss immediately if the Pro feature flag is off.
  useEffect(() => {
    if (!isProSubscriptionEnabled) {
      navigation.goBack();
    }
  }, [isProSubscriptionEnabled, navigation]);

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

  const handleSubscriptionOnSuccess = useCallback(() => {
    navigation.replace(Routes.PRO_HUB.ROOT, {
      source: 'pro_subscription_success',
    });
  }, [navigation]);

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

      {currentScreen === 'benefits' ? (
        <Benefits
          onSuccess={handleSuccess}
          onPlanChange={handlePlanChange}
          initialPlan={selectedPlan}
        />
      ) : checkoutPlan ? (
        <Success onSuccess={handleSubscriptionOnSuccess} />
      ) : null}
    </SafeAreaView>
  );
};

export default ProSubscription;
