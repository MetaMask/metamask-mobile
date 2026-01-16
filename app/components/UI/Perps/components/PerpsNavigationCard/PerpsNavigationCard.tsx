import React from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './PerpsNavigationCard.styles';

/**
 * Represents a single navigation item in the card
 */
export interface NavigationItem {
  /**
   * The label text to display
   */
  label: string;
  /**
   * Optional icon to display on the left
   */
  iconName?: IconName;
  /**
   * Optional flag to show/hide the right arrow icon (defaults to true)
   */
  showArrow?: boolean;
  /**
   * Optional color for the right arrow icon (defaults to IconColor.Alternative)
   */
  arrowColor?: IconColor;
  /**
   * Callback function when the item is pressed
   */
  onPress: () => void;
  /**
   * Optional test ID for E2E testing
   */
  testID?: string;
}

interface PerpsNavigationCardProps {
  /**
   * Array of navigation items to display in the grouped card
   */
  items: NavigationItem[];
}

/**
 * A grouped navigation card component for Perps with iOS-style list appearance.
 * Displays multiple navigation items in a single card with:
 * - Rounded corners on first and last items
 * - Thin separator lines between items (1px gap)
 * - Consistent background color and styling
 *
 * Follows the ListItem design pattern: [Icon] Text [Arrow]
 */
const PerpsNavigationCard: React.FC<PerpsNavigationCardProps> = ({ items }) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const itemStyle = [
          styles.itemWrapper,
          isFirst && styles.itemFirst,
          isLast && styles.itemLast,
        ];

        return (
          <View key={`${item.label}-${index}`} style={itemStyle}>
            <TouchableOpacity onPress={item.onPress} testID={item.testID}>
              <ListItem style={styles.listItem}>
                {item.iconName && (
                  <Icon
                    name={item.iconName}
                    size={IconSize.Md}
                    color={IconColor.Default}
                  />
                )}
                <ListItemColumn widthType={WidthType.Fill}>
                  <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                    {item.label}
                  </Text>
                </ListItemColumn>
                {(item.showArrow ?? true) && (
                  <ListItemColumn widthType={WidthType.Auto}>
                    <Icon
                      name={IconName.ArrowRight}
                      size={IconSize.Md}
                      color={item.arrowColor ?? IconColor.Alternative}
                    />
                  </ListItemColumn>
                )}
              </ListItem>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

export default PerpsNavigationCard;
