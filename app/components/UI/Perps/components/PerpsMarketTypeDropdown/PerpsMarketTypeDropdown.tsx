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
import { styleSheet } from './PerpsMarketTypeDropdown.styles';
import type { PerpsMarketTypeDropdownProps } from './PerpsMarketTypeDropdown.types';

/**
 * PerpsMarketTypeDropdown Component
 *
 * Compact dropdown button for filtering markets by type.
 * Opens bottom sheet for market type selection.
 *
 * Features:
 * - Dropdown button showing current market type filter
 * - Chevron indicator
 * - Opens bottom sheet for filter option selection
 *
 * @example
 * ```tsx
 * <PerpsMarketTypeDropdown
 *   selectedFilter="all"
 *   onPress={() => setShowMarketTypeSheet(true)}
 * />
 * ```
 */
const PerpsMarketTypeDropdown: React.FC<PerpsMarketTypeDropdownProps> = ({
  selectedFilter,
  onPress,
  testID = 'perps-market-type-dropdown',
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Get display label for current market type filter
  const filterLabel = useMemo(() => {
    switch (selectedFilter) {
      case 'crypto':
        return strings('perps.home.tabs.crypto');
      case 'stocks_and_commodities':
        return strings('perps.home.tabs.stocks_and_commodities');
      case 'all':
      default:
        return strings('perps.home.tabs.all');
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
        <Text variant={TextVariant.BodySM} color={TextColor.Default}>
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

export default PerpsMarketTypeDropdown;
