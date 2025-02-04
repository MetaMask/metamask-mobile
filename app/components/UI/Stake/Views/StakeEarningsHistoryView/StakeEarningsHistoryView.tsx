import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import StakingEarningsHistory from '../../components/StakingEarnings/StakingEarningsHistory/StakingEarningsHistory';
import styleSheet from './StakeEarningsHistoryView.styles';
import { StakeEarningsHistoryViewRouteParams } from './StakeEarningsHistoryView.types';

const StakeEarningsHistoryView = () => {
  const navigation = useNavigation();
  const route = useRoute<StakeEarningsHistoryViewRouteParams>();
  const { styles, theme } = useStyles(styleSheet, {});
  const { asset } = route.params;

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(
        strings('stake.earnings_history_title', {
          ticker: asset.ticker,
        }),
        navigation,
        theme.colors,
        {
          backgroundColor: theme.colors.background.default,
          hasCancelButton: false,
          hasBackButton: true,
        },
      ),
    );
  }, [navigation, theme.colors, asset.ticker]);

  return (
    <ScrollView contentContainerStyle={styles.mainContainer}>
      <View>
        <StakingEarningsHistory asset={asset} />
      </View>
    </ScrollView>
  );
};

export default StakeEarningsHistoryView;
