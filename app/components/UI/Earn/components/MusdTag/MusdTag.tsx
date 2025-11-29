import React from 'react';
import { StyleSheet, View } from 'react-native';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../component-library/base-components/TagBase';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';

export const MUSD_TAG_SELECTOR = 'musd-tag';

interface MusdTagProps {
  /**
   * Amount of mUSD to display
   */
  amount: string;
  /**
   * Token symbol (defaults to 'mUSD')
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
      marginTop: 8,
      marginBottom: 8,
    },
  });

/**
 * Tag component that displays mUSD amount.
 * Used in mUSD conversion flow to show the output amount.
 */
const MusdTag: React.FC<MusdTagProps> = ({
  amount,
  symbol = 'mUSD',
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

  return (
    <View style={styles.wrapper}>
      <TagBase
        shape={TagShape.Pill}
        includesBorder={false}
        textProps={{
          variant: TextVariant.BodySMMedium,
        }}
        severity={TagSeverity.Neutral}
        testID={testID || MUSD_TAG_SELECTOR}
        gap={6}
        style={tagStyle}
      >
        {`${amount} ${symbol}`}
      </TagBase>
    </View>
  );
};

export default MusdTag;
