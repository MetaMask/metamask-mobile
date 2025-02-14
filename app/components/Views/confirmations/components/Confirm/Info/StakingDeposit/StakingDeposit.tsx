import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ScrollView, View } from 'react-native';

import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import Footer from '../../Footer';
import TokenHero from '../../TokenHero';
import { getStakingDepositNavbar } from './Navbar';
import styleSheet from './StakingDeposit.styles';

const StakingDeposit = () => {
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const title = strings('stake.stake');
  const { styles } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(getStakingDepositNavbar({ title, onReject }));
  }, [navigation, title]);

  return (
    <View style={styles.container}>
      <ScrollView>
        <TokenHero />
      </ScrollView>
      <Footer />
    </View>
  );
};
export default StakingDeposit;
