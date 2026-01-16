import React, { useMemo } from 'react';
import { Pressable } from 'react-native-gesture-handler';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { styleSheet } from './PerpsStocksCommoditiesDropdown.styles';
import type { PerpsStocksCommoditiesDropdownProps } from './PerpsStocksCommoditiesDropdown.types';

/**
 * PerpsStocksCommoditiesDropdown Component
 *
 * Compact dropdown button for filtering stocks/commodities.
 * Opens bottom sheet for selection.
 *
 * Features:
 * - Dropdown button showing current filter selection
 * - Chevron indicator
 * - Opens bottom sheet for filter option selection
 *
 * @example
 * ```tsx
 * <PerpsStocksCommoditiesDropdown
 *   selectedFilter="all"
 *   onPress={() => setShowSheet(true)}
 * />
 * ```
 */
const PerpsStocksCommoditiesDropdown: React.FC<
  PerpsStocksCommoditiesDropdownProps
> = ({
  selectedFilter,
  onPress,
  testID = 'perps-stocks-commodities-dropdown',
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Get display label for current filter
  const filterLabel = useMemo(() => {
    switch (selectedFilter) {
      case 'equity':
        return strings('perps.home.stocks');
      case 'commodity':
        return strings('perps.home.commodities');
      case 'all':
      default:
        return strings('perps.home.all');
    }
  }, [selectedFilter]);

  return (
    <Box style={styles.container} testID={testID}>
      <Pressable
        style={({ pressed }) => [
          styles.dropdownButton,
          pressed && styles.dropdownButtonPressed,
        ]}
        onPress={onPress}
        testID={`${testID}-button`}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
          {filterLabel}
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

export default PerpsStocksCommoditiesDropdown;
