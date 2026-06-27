import React, { useMemo } from 'react';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SelectButton,
  SelectButtonVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import { styleSheet } from './PerpsMarketSortDropdowns.styles';
import type { PerpsMarketSortDropdownsProps } from './PerpsMarketSortDropdowns.types';
import { MARKET_SORTING_CONFIG } from '@metamask/perps-controller';

/**
 * PerpsMarketSortDropdowns Component
 *
 * Compact dropdown button for market sorting.
 * Opens bottom sheet for sort options selection.
 */
const PerpsMarketSortDropdowns: React.FC<PerpsMarketSortDropdownsProps> = ({
  selectedOptionId,
  onSortPress,
  testID = 'perps-market-sort-dropdowns',
}) => {
  const { styles } = useStyles(styleSheet, {});

  const sortLabel = useMemo(() => {
    const option = MARKET_SORTING_CONFIG.SortOptions.find(
      (opt) => opt.id === selectedOptionId,
    );
    return option ? strings(option.labelKey) : strings('perps.sort.volume');
  }, [selectedOptionId]);

  return (
    <Box style={styles.container} testID={testID}>
      <SelectButton
        testID={`${testID}-sort-field`}
        variant={SelectButtonVariant.Secondary}
        placeholder={sortLabel}
        value={sortLabel}
        onPress={onSortPress}
        hideEndArrow
        endAccessory={
          <Icon
            name={IconName.SwapVertical}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        }
      />
    </Box>
  );
};

export default PerpsMarketSortDropdowns;
