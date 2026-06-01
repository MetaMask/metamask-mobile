import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './StakeEarningsHistoryView.styles';
import { StakeEarningsHistoryViewRouteParams } from './StakeEarningsHistoryView.types';
import EarningsHistory from '../../../Earn/components/Earnings/EarningsHistory/EarningsHistory';

export const STAKE_EARNINGS_HISTORY_VIEW_BACK_BUTTON_TEST_ID =
  'stake-earnings-history-header-back-button';

const StakeEarningsHistoryView = () => {
  const navigation = useNavigation();
  const route = useRoute<StakeEarningsHistoryViewRouteParams>();
  const { styles } = useStyles(styleSheet, {});
  const { asset } = route.params;

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandard
        title={strings('stake.earnings_history_title', {
          ticker: asset.ticker || asset.symbol,
        })}
        onBack={navigation.goBack}
        backButtonProps={{
          testID: STAKE_EARNINGS_HISTORY_VIEW_BACK_BUTTON_TEST_ID,
        }}
        includesTopInset
      />
      <ScrollView contentContainerStyle={styles.mainContainer}>
        <View>
          <EarningsHistory asset={asset} />
        </View>
      </ScrollView>
    </Box>
  );
};

export default StakeEarningsHistoryView;
