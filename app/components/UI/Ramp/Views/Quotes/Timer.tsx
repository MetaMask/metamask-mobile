import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { useFiatOnRampSDK } from '../../sdk';

import Text from '../../../../Base/Text';
import styleSheet from './Quotes.styles';

import { strings } from '../../../../../../locales/i18n';

const Timer = ({
  isFetchingQuotes,
  pollingCyclesLeft,
  remainingTime,
}: {
  isFetchingQuotes: boolean;
  pollingCyclesLeft: number;
  remainingTime: number;
}) => {
  const { appConfig } = useFiatOnRampSDK();
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.timerWrapper}>
      {isFetchingQuotes ? (
        <>
          <ActivityIndicator size="small" />
          <Text> {strings('fiat_on_ramp_aggregator.fetching_new_quotes')}</Text>
        </>
      ) : (
        <Text primary centered>
          {pollingCyclesLeft > 0
            ? strings('fiat_on_ramp_aggregator.new_quotes_in')
            : strings('fiat_on_ramp_aggregator.quotes_expire_in')}{' '}
          <Text
            bold
            primary
            style={[
              styles.timer,
              remainingTime <= appConfig.POLLING_INTERVAL_HIGHLIGHT &&
                styles.timerHiglight,
            ]}
          >
            {new Date(remainingTime).toISOString().substring(15, 19)}
          </Text>
        </Text>
      )}
    </View>
  );
};

export default Timer;
