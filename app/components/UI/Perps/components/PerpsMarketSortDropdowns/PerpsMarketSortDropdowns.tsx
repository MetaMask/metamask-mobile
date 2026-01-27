import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { styleSheet } from './PerpsMarketSortDropdowns.styles';
import type { PerpsMarketSortDropdownsProps } from './PerpsMarketSortDropdowns.types';
import { MARKET_SORTING_CONFIG } from '../../constants/perpsConfig';

/**
 * PerpsMarketSortDropdowns Component
 *
 * Compact dropdown button for market sorting.
 * Opens bottom sheet for sort options selection.
 *
 * Features:
 * - Dropdown button showing current sort selection
 * - Chevron indicator
 * - Opens bottom sheet for sort option selection
 *
 * @example
 * ```tsx
 * <PerpsMarketSortDropdowns
 *   selectedOptionId="volume"
 *   onSortPress={() => setShowSortSheet(true)}
 * />
 * ```
 */
const PerpsMarketSortDropdowns: React.FC<PerpsMarketSortDropdownsProps> = ({
  selectedOptionId,
  onSortPress,
  testID = 'perps-market-sort-dropdowns',
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Get display label for current sort option
  const sortLabel = useMemo(() => {
    const option = MARKET_SORTING_CONFIG.SortOptions.find(
      (opt) => opt.id === selectedOptionId,
    );
    return option ? strings(option.labelKey) : strings('perps.sort.volume');
  }, [selectedOptionId]);

  return (
    <Box style={styles.container} testID={testID}>
      {/* Sort Field Dropdown */}
      <Pressable
        style={({ pressed }) => [
          styles.dropdownButton,
          pressed && styles.dropdownButtonPressed,
        ]}
        onPress={onSortPress}
        testID={`${testID}-sort-field`}
      >
        <Text variant={TextVariant.BodySM} color={TextColor.Default}>
          {sortLabel}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Xs}
          color={IconColor.Alternative}
        />
      </Pressable>
    </Box>
  );
};

export default PerpsMarketSortDropdowns;
