import React from 'react';
import { StyleSheet, View } from 'react-native';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../component-library/base-components/TagBase';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';

export const OUTPUT_AMOUNT_TAG_SELECTOR = 'output-amount-tag';

interface OutputAmountTagProps {
  /**
   * Amount to display
   */
  amount: string;
  /**
   * Token symbol to display after the amount
   */
  symbol?: string;
  /**
   * Whether to show the background color
   * @default true
   */
  showBackground?: boolean;
  /**
   * Optional test ID for the component
   */
  testID?: string;
}

const createStyles = () =>
  StyleSheet.create({
    wrapper: {
      marginBottom: 6,
    },
  });

/**
 * Generic tag component that displays an output amount with symbol.
 * Used in conversion flows to show the expected output amount.
 */
const OutputAmountTag: React.FC<OutputAmountTagProps> = ({
  amount,
  symbol,
  showBackground = true,
  testID,
}) => {
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, {});

  const tagStyle = {
    backgroundColor: showBackground ? colors.background.section : 'transparent',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  };

  const displayText = symbol ? `${amount} ${symbol}` : amount;

  return (
    <View style={styles.wrapper}>
      <TagBase
        shape={TagShape.Pill}
        includesBorder={false}
        textProps={{
          variant: TextVariant.BodySMMedium,
        }}
        severity={TagSeverity.Neutral}
        testID={testID || OUTPUT_AMOUNT_TAG_SELECTOR}
        gap={6}
        style={tagStyle}
      >
        {displayText}
      </TagBase>
    </View>
  );
};

export default OutputAmountTag;
