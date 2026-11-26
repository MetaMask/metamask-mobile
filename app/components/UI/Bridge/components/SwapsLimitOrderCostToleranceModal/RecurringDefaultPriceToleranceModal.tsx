import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import { PriceTolerancePresetModal } from './PriceTolerancePresetModal';
import { useRecurringPriceToleranceModal } from './useRecurringPriceToleranceModal';

export function RecurringDefaultPriceToleranceModal() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const { initialValue, sourceModal, handleSubmit, handleGoBack } =
    useRecurringPriceToleranceModal();

  const handleCustomOptionPress = useCallback(() => {
    navigation.replace(
      Routes.BRIDGE.MODALS.RECURRING_CUSTOM_PRICE_TOLERANCE_MODAL,
      sourceModal ? { sourceModal } : undefined,
    );
  }, [navigation, sourceModal]);

  return (
    <PriceTolerancePresetModal
      initialValue={initialValue}
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
