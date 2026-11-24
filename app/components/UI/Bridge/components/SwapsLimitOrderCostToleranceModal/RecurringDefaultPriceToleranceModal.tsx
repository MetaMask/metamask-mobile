import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectRecurringPriceTolerance,
  setRecurringPriceTolerance,
} from '../../../../../core/redux/slices/bridge';
import { selectBridgeRecurringBuyDefaultPriceTolerance } from '../../../../../selectors/bridge/featureFlags';
import { useParams } from '../../../../../util/navigation/navUtils';
import { PriceTolerancePresetModal } from './PriceTolerancePresetModal';
import type { RecurringPriceToleranceModalParams } from './types';

export function RecurringDefaultPriceToleranceModal() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const dispatch = useDispatch();
  const { sourceModal } = useParams<RecurringPriceToleranceModalParams>();
  const recurringPriceTolerance = useSelector(selectRecurringPriceTolerance);
  const defaultRecurringPriceTolerance = useSelector(
    selectBridgeRecurringBuyDefaultPriceTolerance,
  );

  const handleCustomOptionPress = useCallback(() => {
    navigation.replace(
      Routes.BRIDGE.MODALS.RECURRING_CUSTOM_PRICE_TOLERANCE_MODAL,
      sourceModal ? { sourceModal } : undefined,
    );
  }, [navigation, sourceModal]);

  const handleGoBack = useCallback(() => {
    if (sourceModal) {
      navigation.replace(sourceModal.screen, sourceModal.params);
      return;
    }

    navigation.goBack();
  }, [navigation, sourceModal]);

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
      goBack={handleGoBack}
    />
  );
}
