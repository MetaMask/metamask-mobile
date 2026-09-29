import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
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
import { PRO_DEMO_MODE, setProDemoSubscriber } from '../shared/pro/proDemo';

type ProSubscriptionScreen = 'benefits' | 'success';

// iOS presents this route as a page sheet that already clears the status bar.
// Android has no sheet: the modal is full-screen and edge-to-edge, so without
// the top inset the close button renders under the status bar.
const SAFE_AREA_EDGES: readonly Edge[] =
  Platform.OS === 'android' ? ['top', 'bottom'] : ['bottom'];

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
    // DEMO ONLY: treat the CTA as a completed checkout so the Money header
    // reads `Pro` and routes to Pro Hub for the rest of the session.
    if (PRO_DEMO_MODE) {
      setProDemoSubscriber(true);
    }
  }, []);

  const handleSubscriptionOnSuccess = useCallback(() => {
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
      edges={SAFE_AREA_EDGES}
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

      {screenContent}
    </SafeAreaView>
  );
};

export default ProSubscription;
