import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../../locales/i18n';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import { EARN_EXPERIENCES } from '../../../../../UI/Earn/constants/experiences';
import { EVENT_PROVIDERS } from '../../../../../UI/Stake/constants/events';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import useNavbar from '../../../hooks/ui/useNavbar';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row/advanced-details-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import LendingDetails from './lending-details';
import LendingHero from './lending-hero';
import LendingReceiveSection from './lending-receive-section';
import { useLendingDepositDetails } from './useLendingDepositDetails';

const skeletonStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  heroContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  tokenSkeleton: {
    borderRadius: 32,
  },
  amountSkeleton: {
    borderRadius: 6,
    marginTop: 16,
  },
  fiatSkeleton: {
    borderRadius: 4,
    marginTop: 8,
  },
  sectionSkeleton: {
    borderRadius: 8,
    marginTop: 16,
  },
});

export function LendingDepositInfoSkeleton() {
  return (
    <View
      style={skeletonStyles.container}
      testID={ConfirmationInfoComponentIDs.LENDING_DEPOSIT}
    >
      {/* Hero skeleton */}
      <View style={skeletonStyles.heroContainer}>
        <Skeleton width={64} height={64} style={skeletonStyles.tokenSkeleton} />
        <Skeleton
          width={150}
          height={24}
          style={skeletonStyles.amountSkeleton}
        />
        <Skeleton width={80} height={18} style={skeletonStyles.fiatSkeleton} />
      </View>
      {/* Details section skeleton */}
      <Skeleton
        width="100%"
        height={180}
        style={skeletonStyles.sectionSkeleton}
      />
      {/* Receive section skeleton */}
      <Skeleton
        width="100%"
        height={80}
        style={skeletonStyles.sectionSkeleton}
      />
    </View>
  );
}

const LendingDepositInfo = () => {
  useClearConfirmationOnBackSwipe();

  const details = useLendingDepositDetails();
  const title = `${strings('earn.supply')} ${details?.tokenSymbol ?? ''}`;
  useNavbar(title);
  const { trackPageViewedEvent, setConfirmationMetric } =
    useConfirmationMetricEvents();

  useEffect(() => {
    if (!details?.tokenAmount) {
      return;
    }

    setConfirmationMetric({
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        transaction_amount: details.tokenAmount,
        token: details.tokenSymbol,
        experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
      },
    });
  }, [details?.tokenAmount, details?.tokenSymbol, setConfirmationMetric]);

  useEffect(() => {
    trackPageViewedEvent();
  }, [trackPageViewedEvent]);

  //   // Show spinner while loading (maintains visual continuity with parent loader)
  //   if (!details) {
  //     return (
  //       <View style={styles.spinnerContainer}>
  //         <AnimatedSpinner size={SpinnerSize.MD} />
  //       </View>
  //     );
  //   }

  return (
    <ScrollView testID={ConfirmationInfoComponentIDs.LENDING_DEPOSIT}>
      <LendingHero />
      <LendingDetails />
      <LendingReceiveSection />
      <GasFeesDetailsRow disableUpdate />
      <AdvancedDetailsRow />
    </ScrollView>
  );
};

export default LendingDepositInfo;
