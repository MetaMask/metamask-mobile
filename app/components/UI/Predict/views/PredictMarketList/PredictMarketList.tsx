import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import ScreenView from '../../../../Base/ScreenView';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { getNavigationOptionsTitle } from '../../../Navbar';
import { useTheme } from '../../../../../util/theme';
import styleSheet from './PredictMarketList.styles';
import PredictMarket from '../../components/PredictMarket';

interface PredictMarketListProps {}

const PredictMarketList: React.FC<PredictMarketListProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { colors } = useTheme();

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('predict.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  const markets = [
    {
      id: 1,
      title: 'What price will Ethereum hit in August?',
      price: 21.03,
      change: 2.3,
      volume: 185000,
    },
    {
      id: 2,
      title: 'Will TikTok be banned in the US?',
      price: 59,
      change: 2.3,
      volume: 100000,
    },
  ];

  return (
    <ScreenView>
      <View style={styles.wrapper}>
        <Text variant={TextVariant.HeadingLG}>Prediction Markets</Text>
        <View style={styles.marketListContainer}>
          {markets.map((market) => (
            <PredictMarket
              key={market.id}
              title={market.title}
              price={market.price}
              change={market.change}
              volume={market.volume}
            />
          ))}
        </View>
      </View>
    </ScreenView>
  );
};

export default PredictMarketList;
