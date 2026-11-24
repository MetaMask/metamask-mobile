import React from 'react';
import { PriceToleranceCustomModal } from './PriceToleranceCustomModal';
import { useRecurringPriceToleranceModal } from './useRecurringPriceToleranceModal';

export function RecurringCustomPriceToleranceModal() {
  const { initialValue, handleSubmit, handleGoBack } =
    useRecurringPriceToleranceModal();

  return (
    <PriceToleranceCustomModal
      initialValue={initialValue}
      onConfirm={handleSubmit}
      goBack={handleGoBack}
    />
  );
}
