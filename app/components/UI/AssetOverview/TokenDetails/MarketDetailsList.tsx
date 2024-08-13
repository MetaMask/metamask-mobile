import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import Text from '../../../../component-library/components/Texts/Text';
import Title from '../../../Base/Title';
import styleSheet from './TokenDetails.styles';
import { MarketDetails } from './TokenDetails';

interface MarketDetailsListProps {
  marketDetails: MarketDetails;
}

const MarketDetailsList: React.FC<MarketDetailsListProps> = ({
  marketDetails,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.wrapper}>
      <Title style={styles.title}>{strings('token.market_details')}</Title>
      <View style={styles.listWrapper}>
        {marketDetails.marketCap && (
          <View style={[styles.listItem, styles.firstChild]}>
            <Text style={styles.listItemLabel}>
              {strings('token.market_cap')}
            </Text>
            <Text>{marketDetails.marketCap}</Text>
          </View>
        )}
        {marketDetails.totalVolume && (
          <View style={styles.listItem}>
            <Text>{strings('token.total_volume')}</Text>
            <Text>{marketDetails.totalVolume}</Text>
          </View>
        )}
        {marketDetails.volumeToMarketCap && (
          <View style={styles.listItem}>
            <Text>{strings('token.volume_to_marketcap')}</Text>
            <Text>{marketDetails.volumeToMarketCap}</Text>
          </View>
        )}
        {marketDetails.circulatingSupply && (
          <View style={styles.listItem}>
            <Text>{strings('token.circulating_supply')}</Text>
            <Text>{marketDetails.circulatingSupply}</Text>
          </View>
        )}
        {marketDetails.allTimeHigh && (
          <View style={styles.listItem}>
            <Text>{strings('token.all_time_high')}</Text>
            <Text>{marketDetails.allTimeHigh}</Text>
          </View>
        )}
        {marketDetails.allTimeLow && (
          <View style={styles.listItem}>
            <Text>{strings('token.all_time_low')}</Text>
            <Text>{marketDetails.allTimeLow}</Text>
          </View>
        )}
        {marketDetails.fullyDiluted && (
          <View style={styles.listItem}>
            <Text>{strings('token.fully_diluted')}</Text>
            <Text>{marketDetails.fullyDiluted}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default MarketDetailsList;
