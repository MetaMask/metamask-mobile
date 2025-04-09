import { TransactionMeta } from '@metamask/transaction-controller';
import { RouteProp } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks/useStyles';
import SimulationDetails from '../../../../../../UI/SimulationDetails/SimulationDetails';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import useClearConfirmationOnBackSwipe from '../../../../hooks/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import useNavbar from '../../../../hooks/useNavbar';
import { useTokenValues } from '../../../../hooks/useTokenValues';
import { useTransactionMetadataRequest } from '../../../../hooks/useTransactionMetadataRequest';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import StakingContractInteractionDetails from '../../StakingContractInteractionDetails/StakingContractInteractionDetails';
import TokenHero from '../../TokenHero';
import GasFeesDetails from '../GasFeesDetails';
import styleSheet from './StakingClaim.styles';

const StakingClaim = ({
  route,
}: {
  route: RouteProp<{ params: { amountWei: string } }, 'params'>;
}) => {
  const { styles } = useStyles(styleSheet, {});
  useNavbar(strings('stake.claim'), false);
  useClearConfirmationOnBackSwipe();
  const transactionMetadata = useTransactionMetadataRequest();

  const { trackPageViewedEvent, setConfirmationMetric } =
    useConfirmationMetricEvents();
  const amountWei = route?.params?.amountWei;
  const { tokenAmountDisplayValue } = useTokenValues({ amountWei });
  useEffect(() => {
    setConfirmationMetric({
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        transaction_amount_eth: tokenAmountDisplayValue,
      },
    });
  }, [tokenAmountDisplayValue, setConfirmationMetric]);

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <>
      <TokenHero amountWei={route?.params?.amountWei} />
      <View style={styles.simulationsDetailsContainer}>
        <SimulationDetails
          transaction={transactionMetadata as TransactionMeta}
          enableMetrics={false}
          isTransactionsRedesign
        />
      </View>
      <InfoSection>
        <StakingContractInteractionDetails />
      </InfoSection>
      <GasFeesDetails />
    </>
  );
};
export default StakingClaim;
