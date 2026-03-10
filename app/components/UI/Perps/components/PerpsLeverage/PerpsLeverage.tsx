import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import styleSheet from './PerpsLeverage.styles';
import { useStyles } from '../../../../hooks/useStyles';

interface PerpsLeverageProps {
  maxLeverage: string;
  testID?: string;
  /** Use "column" when the badge is in a column layout (e.g. below text). Default "row" for horizontal rows with alignItems: center. */
  variant?: 'row' | 'column';
}

const PerpsLeverage = ({
  maxLeverage,
  testID = 'perps-leverage',
  variant = 'row',
}: PerpsLeverageProps) => {
  const { styles } = useStyles(styleSheet, {});

  const style =
    variant === 'column'
      ? [styles.maxLeverage, styles.maxLeverageColumn]
      : styles.maxLeverage;

  return (
    <View style={style} testID={testID}>
      <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
        {maxLeverage}
      </Text>
    </View>
  );
};

export default PerpsLeverage;
