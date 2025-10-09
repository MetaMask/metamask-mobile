import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './amount-highlight.styles';

export function AmountHighlight() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box style={styles.container}>
      <Text variant={TextVariant.HeadingLG} color={TextColor.Alternative}>
        You won
      </Text>
      <Text variant={TextVariant.BodyMDMedium} style={styles.value}>
        $299.09
      </Text>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Success}
        style={styles.change}
      >
        +$46.35 (20.23%)
      </Text>
    </Box>
  );
}
