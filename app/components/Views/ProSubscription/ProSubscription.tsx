import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import LinearGradient from 'react-native-linear-gradient';
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
import type { PlanId } from './screens/Benefits/Benefits.constants';
import { ProSubscriptionTestIds } from './ProSubscription.testIds';
import {
  ORANGE_GRADIENT_COLORS,
  ORANGE_GRADIENT_END,
  ORANGE_GRADIENT_START,
} from '../shared/pro/brand.constants';

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

  // Guard: dismiss immediately if the Pro feature flag is off.
  useEffect(() => {
    if (!isProSubscriptionEnabled) {
      navigation.goBack();
    }
  }, [isProSubscriptionEnabled, navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSuccess = useCallback(() => {
    setCurrentScreen('success');
  }, []);

  const handleSubscriptionOnSuccess = useCallback(() => {
    navigation.replace(Routes.PRO_HUB.ROOT, {
      source: 'pro_subscription_success',
    });
  }, [navigation]);

  return (
    <LinearGradient
      colors={ORANGE_GRADIENT_COLORS}
      start={ORANGE_GRADIENT_START}
      end={ORANGE_GRADIENT_END}
      style={tw.style('flex-1')}
    >
      <SafeAreaView
        style={tw.style('flex-1')}
        /*
         * `top` added with the push presentation: the modal presentation used to
         * inset the content itself, so a bottom-only edge left the back button
         * sitting in the status bar once this became a pushed card.
         */
        edges={['top', 'bottom']}
      >
        {/*
        Shared back button — sits above both Benefits and Success screens.

        IA EXPERIMENT: this was a trailing close button, matching the modal
        presentation. The view now pushes, so the affordance is a leading back
        arrow instead. Longer term this should follow the presentation rather
        than being hardcoded — close when presented modally, back when pushed —
        which means reading the presentation (e.g. a route param set by the
        caller) rather than assuming one.
      */}
        {/*
        Compact toolbar. `pb-8` here was breathing room beneath the old
        trailing close button on a modal; as a pushed back-button row it
        just made the chrome ~80pt tall and pushed the scroll down.
      */}
        <Box twClassName="px-4 pt-2 pb-2 flex-row items-center justify-start">
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={handleBack}
            testID={ProSubscriptionTestIds.BACK_BUTTON}
          />
        </Box>

        {currentScreen === 'benefits' ? (
          <Benefits
            onSuccess={handleSuccess}
            initialPlan={route.params?.initialPlan as PlanId | undefined}
          />
        ) : (
          <Success onSuccess={handleSubscriptionOnSuccess} />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ProSubscription;
