import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './Hip3Badge.styles';

interface Hip3BadgeProps {
  dexName?: string;
  compact?: boolean;
}

/**
 * Badge component to indicate HIP-3 (builder-deployed) perpetual markets
 */
const Hip3Badge: React.FC<Hip3BadgeProps> = ({ dexName, compact = false }) => {
  const { styles } = useStyles(styleSheet, {});
  const badgeText = compact ? 'HIP-3' : dexName ? `HIP-3: ${dexName}` : 'HIP-3';

  return (
    <View style={styles.container}>
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Warning}
        style={styles.text}
      >
        {badgeText}
      </Text>
    </View>
  );
};

export default Hip3Badge;
