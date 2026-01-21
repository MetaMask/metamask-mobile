import React from 'react';
import { TouchableOpacity, Image, View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import createStyles from './PerpsProviderSelector.styles';
import type { PerpsProviderSelectorBadgeProps } from './PerpsProviderSelector.types';

/**
 * Badge component that displays the current provider in the header
 * Tapping opens the provider selector bottom sheet
 */
const PerpsProviderSelectorBadge: React.FC<PerpsProviderSelectorBadgeProps> = ({
  currentProvider,
  onPress,
  testID,
}) => {
  const { styles } = useStyles(createStyles, {});

  return (
    <TouchableOpacity
      style={styles.badgeContainer}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Current provider: ${currentProvider.name}. Tap to change.`}
    >
      {currentProvider.iconUrl && (
        <Image
          source={{ uri: currentProvider.iconUrl }}
          style={styles.badgeIcon}
          resizeMode="contain"
        />
      )}
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Default}
        style={styles.badgeText}
      >
        {currentProvider.name}
      </Text>
      <View style={styles.badgeCollateral}>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          · {currentProvider.collateralSymbol}
        </Text>
      </View>
      <Icon
        name={IconName.ArrowDown}
        size={IconSize.Sm}
        color={IconColor.Alternative}
        style={styles.badgeChevron}
      />
    </TouchableOpacity>
  );
};

export default PerpsProviderSelectorBadge;
