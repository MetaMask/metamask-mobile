import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { addCurrencySymbol } from '../../../../util/number';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const createStyles = (priceDiff: number) => {
  const red = '#FF3B30';
  const green = '#28A745';
  const grey = '#535A61';
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
    },
    symbol: {
      fontSize: 12,
      color: grey,
      marginVertical: 0,
    },
    price: {
      fontSize: 32,
      fontWeight: 'bold',
      marginVertical: 0,
    },
    priceDiff: {
      marginVertical: 0,
      fontSize: 14,
      color: priceDiff > 0 ? green : priceDiff < 0 ? red : grey,
    },
    priceDiffIcon: {
      marginRight: 4,
    },
    today: {
      fontSize: 14,
      color: grey,
    },
    loadingPrice: {
      paddingTop: 8,
    },
    loadingPriceDiff: {
      paddingTop: 2,
    },
  });
};

interface PriceProps {
  symbol: string;
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
}

const Price = ({
  symbol,
  priceDiff,
  currentPrice,
  currentCurrency,
  comparePrice,
  isLoading,
}: PriceProps) => {
  const styles = createStyles(priceDiff);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.symbol}>{symbol}</Text>
      <Title style={styles.price}>
        {isLoading ? (
          <View style={styles.loadingPrice}>
            <SkeletonPlaceholder>
              <SkeletonPlaceholder.Item
                width={100}
                height={32}
                borderRadius={6}
              />
            </SkeletonPlaceholder>
          </View>
        ) : (
          addCurrencySymbol(currentPrice, currentCurrency)
        )}
      </Title>
      <Text>
        {isLoading ? (
          <View style={styles.loadingPriceDiff}>
            <SkeletonPlaceholder>
              <SkeletonPlaceholder.Item
                width={150}
                height={18}
                borderRadius={6}
              />
            </SkeletonPlaceholder>
          </View>
        ) : (
          <Text style={styles.priceDiff}>
            <Icon
              name={
                priceDiff > 0
                  ? 'caret-up'
                  : priceDiff < 0
                  ? 'caret-down'
                  : 'minus'
              }
              size={18}
              style={styles.priceDiffIcon}
            />
            {addCurrencySymbol(priceDiff, currentCurrency)} (
            {priceDiff > 0 ? '+' : ''}
            {priceDiff === 0
              ? '0'
              : ((priceDiff / comparePrice) * 100).toFixed(2)}
            %) <Text style={styles.today}>Today</Text>
          </Text>
        )}
      </Text>
    </View>
  );
};

export default Price;
