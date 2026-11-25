import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectRecurringPriceTolerance,
  setRecurringPriceTolerance,
} from '../../../../../core/redux/slices/bridge';
import { selectBridgeRecurringBuyDefaultPriceTolerance } from '../../../../../selectors/bridge/featureFlags';
import { useParams } from '../../../../../util/navigation/navUtils';
import type { RecurringPriceToleranceModalParams } from './types';

export function useRecurringPriceToleranceModal() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const dispatch = useDispatch();
  const { sourceModal } = useParams<RecurringPriceToleranceModalParams>();
  const recurringPriceTolerance = useSelector(selectRecurringPriceTolerance);
  const defaultRecurringPriceTolerance = useSelector(
    selectBridgeRecurringBuyDefaultPriceTolerance,
  );

  const handleSubmit = useCallback(
    (value: string) => {
      dispatch(setRecurringPriceTolerance(value));
    },
    [dispatch],
  );

  const handleGoBack = useCallback(() => {
    if (sourceModal) {
      navigation.replace(sourceModal.screen, sourceModal.params);
      return;
    }

    navigation.goBack();
  }, [navigation, sourceModal]);

  return {
    initialValue: recurringPriceTolerance ?? defaultRecurringPriceTolerance,
    sourceModal,
    handleSubmit,
    handleGoBack,
  };
}
