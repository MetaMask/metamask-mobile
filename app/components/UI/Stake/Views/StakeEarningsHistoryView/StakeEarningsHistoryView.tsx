import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import StakingEarningsHistory from '../../components/StakingEarnings/StakingEarningsHistory/StakingEarningsHistory';
import styleSheet from './StakeEarningsHistoryView.styles';
import { StakeEarningsHistoryViewProps } from './StakeEarningsHistoryView.types';

const StakeEarningsHistoryView = ({ route }: StakeEarningsHistoryViewProps) => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { asset } = route.params;
  const ticker = asset.ticker || asset.symbol;

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(
        strings('stake.earnings_history_title', {
          ticker,
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
  }, [navigation, theme.colors, ticker]);

  return (
    <ScrollView contentContainerStyle={styles.mainContainer}>
      <View>
        <StakingEarningsHistory asset={asset} />
      </View>
    </ScrollView>
  );
};

export default StakeEarningsHistoryView;
