import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useProSubscriptionEnabled } from '../../../hooks/useProSubscriptionEnabled';
import Benefits from './screens/Benefits';
import Success from './screens/Success';
import type { RootStackParamList } from '../../../core/NavigationService/types';
import type { PlanId } from './screens/Benefits/Benefits.constants';

type ProSubscriptionScreen = 'benefits' | 'success';

const ProSubscription = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const route = useRoute<RouteProp<RootStackParamList, 'ProSubscription'>>();

  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const [currentScreen, setCurrentScreen] =
    useState<ProSubscriptionScreen>('benefits');

  // Guard: dismiss immediately if the Pro feature flag is off.
  useEffect(() => {
    if (!isProSubscriptionEnabled) {
      navigation.goBack();
    }
  }, [isProSubscriptionEnabled, navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSuccess = useCallback(() => {
    setCurrentScreen('success');
  }, []);

  return (
    <SafeAreaView style={tw.style('flex-1')} edges={['top']}>
      {currentScreen === 'benefits' ? (
        <Benefits
          onSuccess={handleSuccess}
          onClose={handleClose}
          initialPlan={route.params?.initialPlan as PlanId | undefined}
        />
      ) : (
        <Success onClose={handleClose} />
      )}
    </SafeAreaView>
  );
};

export default ProSubscription;
