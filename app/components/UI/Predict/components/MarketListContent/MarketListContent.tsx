import React from 'react';
import { View, ScrollView } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import AnimatedSpinner, { SpinnerSize } from '../../../../UI/AnimatedSpinner';
import styleSheet from './MarketListContent.styles';
import { MarketCategory, PredictEvent } from '../../types';
import PredictMarket from '../PredictMarket';
import PredictMarketMultiple from '../PredictMarketMultiple';
interface MarketListContentProps {
  category: MarketCategory;
}

const MarketListContent: React.FC<MarketListContentProps> = ({ category }) => {
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const { marketData, isLoading, error } = usePredictMarketData({ category });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <AnimatedSpinner size={SpinnerSize.MD} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
          Error: {error}
        </Text>
      </View>
    );
  }

  if (!marketData || marketData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          No {category} markets available
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.marketListContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={tw.style('pb-5')}
    >
      {marketData.map((event: PredictEvent) => event.markets.length === 1 ? (
          <PredictMarket key={event.markets[0].id} market={event.markets[0]} />
        ) : (
          <PredictMarketMultiple key={event.id} event={event} />
        ))}
    </ScrollView>
  );
};

export default MarketListContent;
