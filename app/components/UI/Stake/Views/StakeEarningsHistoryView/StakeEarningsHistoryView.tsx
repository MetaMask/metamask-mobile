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

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(
        strings('stake.earnings_history_title', { symbol: asset.symbol }),
        navigation,
        theme.colors,
        {
          backgroundColor: theme.colors.background.default,
          hasCancelButton: false,
          hasBackButton: true,
        },
      ),
    );
  }, [navigation, theme.colors, asset.symbol]);

  return (
    <ScrollView contentContainerStyle={styles.mainContainer}>
      <View>
        <StakingEarningsHistory asset={asset} />
      </View>
    </ScrollView>
  );
};

export default StakeEarningsHistoryView;
