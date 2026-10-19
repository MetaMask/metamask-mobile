import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';

export function useOpenPredictHome() {
  const navigation = useNavigation<AppNavigationProp>();

  return useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  }, [navigation]);
}
