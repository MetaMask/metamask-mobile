import React, { useCallback } from 'react';
import { View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import styleSheet from './UnstakeConfirmationView.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import UnstakingTimeCard from '../../components/StakingConfirmation/UnstakeTimeCard/UnstakeTimeCard';
import { UnstakeConfirmationViewRouteParams } from './UnstakeConfirmationView.types';
import TokenValueStack from '../../components/StakingConfirmation/TokenValueStack/TokenValueStack';
import AccountCard from '../../components/StakingConfirmation/AccountCard/AccountCard';
import ConfirmationFooter from '../../components/StakingConfirmation/ConfirmationFooter/ConfirmationFooter';
import { FooterButtonGroupActions } from '../../components/StakingConfirmation/ConfirmationFooter/FooterButtonGroup/FooterButtonGroup.types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import { getDecimalChainId } from '../../../../../util/networks';
import { selectEvmChainId } from '../../../../../selectors/networkController';

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

export const UNSTAKE_CONFIRMATION_VIEW_BACK_BUTTON_TEST_ID =
  'unstake-confirmation-header-back-button';

const UnstakeConfirmationView = () => {
  const route =
    useRoute<
      RouteProp<{ params: UnstakeConfirmationViewRouteParams }, 'params'>
    >();
  const { styles } = useStyles(styleSheet, {});
  const chainId = useSelector(selectEvmChainId);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleBackPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.UNSTAKE_CONFIRMATION_BACK_CLICKED)
        .addProperties({
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          location: EVENT_LOCATIONS.UNSTAKE_CONFIRMATION_VIEW,
        })
        .build(),
    );
    navigation.goBack();
  }, [navigation, trackEvent, createEventBuilder]);

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandard
        title={strings('stake.unstake')}
        onBack={handleBackPress}
        backButtonProps={{
          testID: UNSTAKE_CONFIRMATION_VIEW_BACK_BUTTON_TEST_ID,
        }}
        includesTopInset
      />
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
    </Box>
  );
};

export default UnstakeConfirmationView;
