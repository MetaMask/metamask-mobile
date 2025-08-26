import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import ScreenView from '../../../../Base/ScreenView';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { getNavigationOptionsTitle } from '../../../Navbar';
import { useTheme } from '../../../../../util/theme';
import styleSheet from './PredictMarketList.styles';
import PredictMarket from '../../components/PredictMarket';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import AnimatedSpinner, { SpinnerSize } from '../../../../UI/AnimatedSpinner';

interface PredictMarketListProps {}

const PredictMarketList: React.FC<PredictMarketListProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { marketData, isLoading, error } = usePredictMarketData();

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

  return (
    <ScreenView>
      <View style={styles.wrapper}>
        <Text variant={TextVariant.HeadingLG} style={styles.titleText}>
          Prediction Markets
        </Text>
        <View style={styles.marketListContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <AnimatedSpinner size={SpinnerSize.MD} />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
                Error: {error}
              </Text>
            </View>
          ) : marketData && marketData.length > 0 ? (
            marketData.map((market) => (
              <PredictMarket key={market.id} market={market} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                No markets available
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScreenView>
  );
};

export default PredictMarketList;
