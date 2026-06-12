import React from 'react';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { View } from 'react-native';
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
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {maxLeverage}
      </Text>
    </View>
  );
};

export default PerpsLeverage;
