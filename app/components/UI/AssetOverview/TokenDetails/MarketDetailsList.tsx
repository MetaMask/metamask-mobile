import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import Title from '../../../Base/Title';
import styleSheet from './TokenDetails.styles';
import { MarketDetails } from './TokenDetails';
import TokenDetailsListItem from './TokenDetailsListItem';

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
          <TokenDetailsListItem
            style={[styles.listItem, styles.firstChild]}
            label={strings('token.market_cap')}
            value={marketDetails.marketCap}
          />
        )}
        {marketDetails.totalVolume && (
          <TokenDetailsListItem
            style={styles.listItem}
            label={strings('token.total_volume')}
            value={marketDetails.totalVolume}
          />
        )}
        {marketDetails.volumeToMarketCap && (
          <TokenDetailsListItem
            style={styles.listItem}
            label={strings('token.volume_to_marketcap')}
            value={marketDetails.volumeToMarketCap}
          />
        )}
        {marketDetails.circulatingSupply && (
          <TokenDetailsListItem
            style={styles.listItem}
            label={strings('token.circulating_supply')}
            value={marketDetails.circulatingSupply}
          />
        )}
        {marketDetails.allTimeHigh && (
          <TokenDetailsListItem
            style={styles.listItem}
            label={strings('token.all_time_high')}
            value={marketDetails.allTimeHigh}
          />
        )}
        {marketDetails.allTimeLow && (
          <TokenDetailsListItem
            style={styles.listItem}
            label={strings('token.all_time_low')}
            value={marketDetails.allTimeLow}
          />
        )}
        {marketDetails.fullyDiluted && (
          <TokenDetailsListItem
            style={styles.listItem}
            label={strings('token.fully_diluted')}
            value={marketDetails.fullyDiluted}
          />
        )}
      </View>
    </View>
  );
};

export default MarketDetailsList;
