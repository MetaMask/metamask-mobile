import React, { useMemo } from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  SelectButton,
  SelectButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsMarketSortDropdownsProps } from './PerpsMarketSortDropdowns.types';
import { MARKET_SORTING_CONFIG } from '@metamask/perps-controller';

/**
 * PerpsMarketSortDropdowns Component
 *
 * Compact select button for market sorting.
 * Opens bottom sheet for sort options selection.
 */
const PerpsMarketSortDropdowns: React.FC<PerpsMarketSortDropdownsProps> = ({
  selectedOptionId,
  onSortPress,
  testID = 'perps-market-sort-dropdowns',
}) => {
  const sortLabel = useMemo(() => {
    const option = MARKET_SORTING_CONFIG.SortOptions.find(
      (opt) => opt.id === selectedOptionId,
    );
    return option ? strings(option.labelKey) : strings('perps.sort.volume');
  }, [selectedOptionId]);

  return (
    <SelectButton
      variant={SelectButtonVariant.Tertiary}
      value={sortLabel}
      placeholder={strings('perps.sort.volume')}
      onPress={onSortPress}
      testID={`${testID}-sort-field`}
      endAccessory={
        <Icon
          name={IconName.SwapVertical}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      }
    />
  );
};

export default PerpsMarketSortDropdowns;
