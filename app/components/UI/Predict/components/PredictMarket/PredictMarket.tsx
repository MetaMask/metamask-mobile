import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PredictMarket.styles';
import Button, { ButtonVariants , ButtonSize , ButtonWidthTypes } from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
interface PredictMarketProps {
  title?: string;
  price?: number;
  change?: number;
  volume?: number;
}

const PredictMarket: React.FC<PredictMarketProps> = ({
  title,
  change,
  volume,
}: PredictMarketProps) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.marketContainer}>
      <View style={styles.marketHeader}>
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {title}
        </Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
          {change}%
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('predict.buy_yes')}
          onPress={() => navigation.navigate(Routes.PREDICT.MARKET_DETAILS)}
          style={styles.buttonYes}
        />
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('predict.buy_no')}
          onPress={() => navigation.navigate(Routes.PREDICT.MARKET_DETAILS)}
          style={styles.buttonNo}
        />
      </View>
      <View style={styles.marketFooter}>
        <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
          ${volume?.toLocaleString()} Vol.
        </Text>
      </View>
    </View>
  );
};

export default PredictMarket;
