import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectRecurringPriceTolerance,
  setRecurringPriceTolerance,
} from '../../../../../core/redux/slices/bridge';
import { selectBridgeRecurringBuyDefaultPriceTolerance } from '../../../../../selectors/bridge/featureFlags';
import { PriceTolerancePresetModal } from './PriceTolerancePresetModal';

export function RecurringDefaultPriceToleranceModal() {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const recurringPriceTolerance = useSelector(selectRecurringPriceTolerance);
  const defaultRecurringPriceTolerance = useSelector(
    selectBridgeRecurringBuyDefaultPriceTolerance,
  );

  const handleCustomOptionPress = useCallback(() => {
    navigation.goBack();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_CUSTOM_PRICE_TOLERANCE_MODAL,
    });
  }, [navigation]);

  const handleSubmit = useCallback(
    (value: string) => {
      dispatch(setRecurringPriceTolerance(value));
    },
    [dispatch],
  );

  return (
    <PriceTolerancePresetModal
      initialValue={recurringPriceTolerance ?? defaultRecurringPriceTolerance}
      getDescription={(value) =>
        strings('bridge.recurring.default_price_tolerance_description', {
          costTolerance: value,
        })
      }
      onCustomPress={handleCustomOptionPress}
      onSubmit={handleSubmit}
      goBack={navigation.goBack}
    />
  );
}
