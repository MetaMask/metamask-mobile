import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import MoneyHeader from '../../components/MoneyHeader';
import MoneyActionButtonRow from '../../components/MoneyActionButtonRow';
import MoneyYourPosition from '../../components/MoneyYourPosition';
import MoneyHowItWorks from '../../components/MoneyHowItWorks';
import MoneyPotentialEarnings from '../../components/MoneyPotentialEarnings';
import MoneyMetaMaskCard from '../../components/MoneyMetaMaskCard';
import MoneyWhyMetaMaskMoney from '../../components/MoneyWhyMetaMaskMoney';
import MoneyFooter from '../../components/MoneyFooter';
import { MoneyHomeViewTestIds } from './MoneyHomeView.testIds';
import styleSheet from './MoneyHomeView.styles';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';

const HARDCODED_BALANCE = '$0.00';

const Divider = () => <Box twClassName="h-px bg-border-muted my-2" />;

const MoneyHomeView = () => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
      testID={MoneyHomeViewTestIds.CONTAINER}
    >
      <Box twClassName="flex-1 bg-default">
        <ScrollView
          testID={MoneyHomeViewTestIds.SCROLL_VIEW}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MoneyHeader
            balance={HARDCODED_BALANCE}
            apy={String(MUSD_CONVERSION_APY)}
            onBackPress={handleBackPress}
          />
          <MoneyActionButtonRow />
          <Divider />
          <MoneyYourPosition />
          <Divider />
          <MoneyHowItWorks />
          <Divider />
          <MoneyPotentialEarnings />
          <Divider />
          <MoneyMetaMaskCard />
          <Divider />
          <MoneyWhyMetaMaskMoney />
        </ScrollView>
        <MoneyFooter />
      </Box>
    </SafeAreaView>
  );
};

export default MoneyHomeView;
