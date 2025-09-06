import { View } from 'react-native';
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import styleSheet from './UnstakeConfirmationView.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import UnstakingTimeCard from '../../components/StakingConfirmation/UnstakeTimeCard/UnstakeTimeCard';
import TokenValueStack from '../../components/StakingConfirmation/TokenValueStack/TokenValueStack';
import AccountCard from '../../components/StakingConfirmation/AccountCard/AccountCard';
import ConfirmationFooter from '../../components/StakingConfirmation/ConfirmationFooter/ConfirmationFooter';
import { FooterButtonGroupActions } from '../../components/StakingConfirmation/ConfirmationFooter/FooterButtonGroup/FooterButtonGroup.types';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import { getDecimalChainId } from '../../../../../util/networks';
import { useSelector } from 'react-redux';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import type { RootParamList } from '../../../../../util/navigation/types';
import type { StackScreenProps } from '@react-navigation/stack';

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

type UnstakeConfirmationViewProps = StackScreenProps<
  RootParamList,
  'UnstakeConfirmation'
>;

const UnstakeConfirmationView = ({ route }: UnstakeConfirmationViewProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const chainId = useSelector(selectEvmChainId);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(
        strings('stake.unstake'),
        navigation,
        theme.colors,
        {
          backgroundColor: theme.colors.background.alternative,
          hasCancelButton: false,
        },
        {
          backButtonEvent: {
            event: MetaMetricsEvents.UNSTAKE_CONFIRMATION_BACK_CLICKED,
            properties: {
              selected_provider: EVENT_PROVIDERS.CONSENSYS,
              location: EVENT_LOCATIONS.UNSTAKE_CONFIRMATION_VIEW,
            },
          },
        },
      ),
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
          <UnstakingTimeCard />
          <AccountCard
            contractName={MOCK_STAKING_CONTRACT_NAME}
            primaryLabel={strings('stake.unstaking_to')}
            secondaryLabel={strings('stake.interacting_with')}
            chainId={getDecimalChainId(chainId)}
          />
        </View>
      </View>
      <ConfirmationFooter
        valueWei={route.params.amountWei}
        action={FooterButtonGroupActions.UNSTAKE}
      />
    </View>
  );
};

export default UnstakeConfirmationView;
