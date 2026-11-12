import React, { useCallback, useContext } from 'react';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import Engine from '../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import CollectiblesOnboarding from './CollectiblesOnboarding';
import { CollectiblesOnboardingContext } from '../../CollectiblesOnboardingContext';
import type { CollectiblesStackParamList } from '../../types/navigation';

/** Completing onboarding unlocks the Collectibles routes for every account. */
const CollectiblesOnboardingScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();
  const { params } =
    useRoute<RouteProp<CollectiblesStackParamList, 'CollectiblesOnboarding'>>();
  const completeOnboarding = useContext(CollectiblesOnboardingContext);
  const complete = useCallback(() => {
    if (completeOnboarding) completeOnboarding(params?.destination);
    else Engine.context.CollectiblesController.completeOnboarding();
  }, [completeOnboarding, params?.destination]);

  return (
    <CollectiblesOnboarding
      onComplete={complete}
      onClose={() => navigation.goBack()}
      isActive={isFocused}
    />
  );
};

export default CollectiblesOnboardingScreen;
