import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import TagColored from '../../../../../component-library/components-temp/TagColored';
import { TagColor } from '../../../../../component-library/components-temp/TagColored/TagColored.types';
import FoxIcon from '../FoxIcon/FoxIcon';
import { createStyles } from './PerpsFeesDisplay.styles';
import { useTheme } from '../../../../../util/theme';

interface PerpsFeesDisplayProps {
  feeDiscountPercentage?: number;
  formatFeeText: string;
  variant?: TextVariant;
}

const PerpsFeesDisplay: React.FC<PerpsFeesDisplayProps> = ({
  feeDiscountPercentage,
  formatFeeText,
  variant = TextVariant.BodyMD,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.feeRowContent}>
      {feeDiscountPercentage && feeDiscountPercentage > 0 ? (
        <TagColored color={TagColor.Warning}>
          <View style={styles.feeDiscountContainer}>
            <FoxIcon width={14} height={14} />
            <Text variant={TextVariant.BodySM}>
              {`-${feeDiscountPercentage}%`}
            </Text>
          </View>
        </TagColored>
      ) : null}
      <Text variant={variant} color={TextColor.Alternative}>
        {formatFeeText}
      </Text>
    </View>
  );
};

export default PerpsFeesDisplay;
