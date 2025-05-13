import { useMemo } from 'react';

const useAdvancedGasFeeOption = (
  isAdvancedGasFeeSelected: boolean,
  onAdvancedGasFeeClick: () => void,
  value: string,
  valueInFiat: string
) => {
  return useMemo(
    () => [
      {
        emoji: '⚙️',
        estimatedTime: '',
        isSelected: isAdvancedGasFeeSelected,
        key: 'advanced',
        name: strings('transactions.gas_modal.advanced'),
        onSelect: onAdvancedGasFeeClick,
        value,
        valueInFiat,
      },
    ],
    [
      isAdvancedGasFeeSelected,
      onAdvancedGasFeeClick,
      value,
      valueInFiat,
    ]
  );
};

export default useAdvancedGasFeeOption; 