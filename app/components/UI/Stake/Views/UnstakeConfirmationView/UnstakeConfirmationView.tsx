import { View } from 'react-native';
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import styleSheet from './UnstakeConfirmationView.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import AccountHeaderCard from '../../components/Confirmation/AccountHeaderCard/AccountHeaderCard';
import { strings } from '../../../../../../locales/i18n';
import ConfirmationFooter from '../../components/Confirmation/ConfirmationFooter/ConfirmationFooter';
import YouReceiveCard from '../../components/Confirmation/YouReceiveCard/YouReceiveCard';
import UnstakingTimeCard from '../../components/Confirmation/UnstakeTimeCard/UnstakeTimeCard';
import { UnstakeConfirmationViewProps } from './UnstakeConfirmationView.types';
import TokenValueStack from '../../components/StakingConfirmation/TokenValueStack/TokenValueStack';

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

const UnstakeConfirmationView = ({ route }: UnstakeConfirmationViewProps) => {
  const { styles, theme } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(strings('stake.unstake'), navigation, theme.colors, {
        backgroundColor: theme.colors.background.alternative,
        hasCancelButton: false,
      }),
    );
  }, [navigation, theme.colors]);

  return (
    <View style={styles.mainContainer}>
      <View>
        <TokenValueStack
          amountWei={route.params.amountWei}
          amountFiat={`$${route.params.amountFiat}`}
          tokenSymbol="ETH"
        />
        <View style={styles.cardsContainer}>
          <YouReceiveCard
            amountWei={route.params.amountWei}
            amountFiat={route.params.amountFiat}
          />
          <AccountHeaderCard
            contractName={MOCK_STAKING_CONTRACT_NAME}
            primaryLabel={strings('stake.unstaking_to')}
            secondaryLabel={strings('stake.interacting_with')}
          />
          <UnstakingTimeCard />
        </View>
      </View>
      <ConfirmationFooter />
    </View>
  );
};

export default UnstakeConfirmationView;
