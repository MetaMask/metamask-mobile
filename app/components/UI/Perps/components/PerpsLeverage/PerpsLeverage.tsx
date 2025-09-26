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
}

const PerpsLeverage = ({
  maxLeverage,
  testID = 'perps-leverage',
}: PerpsLeverageProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.maxLeverage} testID={testID}>
      <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
        {maxLeverage}
      </Text>
    </View>
  );
};

export default PerpsLeverage;
