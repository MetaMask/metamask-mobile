import { View } from 'react-native';
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import styleSheet from './UnstakeConfirmationView.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakeConfirmationNavbar } from '../../../Navbar';
import AmountHeader from '../../components/Confirmation/AmountHeader/AmountHeader';
import AccountHeaderCard from '../../components/Confirmation/AccountHeaderCard/AccountHeaderCard';
import { strings } from '../../../../../../locales/i18n';
import EstimatedGasCard from '../../components/Confirmation/EstimatedGasCard/EstimatedGasCard';
import ConfirmationFooter from '../../components/Confirmation/ConfirmationFooter/ConfirmationFooter';
import YouReceiveCard from '../../components/Confirmation/YouReceiveCard/YouReceiveCard';
import UnstakingTimeCard from '../../components/Confirmation/UnstakeTimeCard/UnstakeTimeCard';

const MOCK_UNSTAKE_DATA = {
  wei: '4999820000000000000',
  fiat: '12,881.64',
};

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

const MOCK_GAS_COST = {
  gasCostEth: '0.0884',
  gasCostFiat: '43.56',
};

const UnstakeConfirmationView = () => {
  const { styles, theme } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions(
      getStakeConfirmationNavbar(
        navigation,
        theme.colors,
        strings('stake.unstake'),
      ),
    );
  }, [navigation, theme.colors]);

  return (
    <View style={styles.mainContainer}>
      <View>
        <AmountHeader
          wei={MOCK_UNSTAKE_DATA.wei}
          fiat={`$${MOCK_UNSTAKE_DATA.fiat}`}
          tokenSymbol="ETH"
        />
        <View style={styles.cardsContainer}>
          <YouReceiveCard
            wei={MOCK_UNSTAKE_DATA.wei}
            fiat={MOCK_UNSTAKE_DATA.fiat}
          />
          <AccountHeaderCard
            contractName={MOCK_STAKING_CONTRACT_NAME}
            primaryLabel={strings('stake.unstaking_to')}
            secondaryLabel={strings('stake.interacting_with')}
          />
          <EstimatedGasCard
            gasCostEth={`${MOCK_GAS_COST.gasCostEth} ETH`}
            gasCostFiat={`$${MOCK_GAS_COST.gasCostFiat}`}
          />
          <UnstakingTimeCard />
        </View>
      </View>
      <ConfirmationFooter />
    </View>
  );
};

export default UnstakeConfirmationView;
