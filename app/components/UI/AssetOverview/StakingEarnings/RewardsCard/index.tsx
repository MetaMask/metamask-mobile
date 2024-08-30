import React from 'react';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './RewardsCard.styles';
import Text from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';

interface RewardsCardProps {
  title: string;
  amount: string;
  symbol: string;
  footer: string;
}

const RewardsCard = ({ title, amount, symbol, footer }: RewardsCardProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.rewardsCard}>
      <Text style={styles.rewardsCardTitle}>{title}</Text>
      <Text style={styles.rewardsCardAmount}>
        {amount} {symbol}
      </Text>
      <Text style={styles.rewardsCardFooterText}>{footer}</Text>
    </View>
  );
};

export default RewardsCard;
