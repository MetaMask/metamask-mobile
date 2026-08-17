import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
import type { PlanId } from './screens/Benefits/Benefits.constants';
import { ProSubscriptionTestIds } from './ProSubscription.testIds';

type ProSubscriptionScreen = 'benefits' | 'success';

export interface ProSubscriptionRouteParams {
  source?: string;
  initialPlan?: PlanId;
}

const ProSubscription = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const route =
    useRoute<RouteProp<{ params: ProSubscriptionRouteParams }, 'params'>>();

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
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['top']}
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
          initialPlan={route.params?.initialPlan}
        />
      ) : (
        <Success onClose={handleClose} />
      )}
    </SafeAreaView>
  );
};

export default ProSubscription;
