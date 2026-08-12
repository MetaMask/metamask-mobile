import React, { useCallback, useMemo } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../../../Wallet/WalletView.testIds';
import { PredictEntryPointProvider } from '../../../../../../UI/Predict/contexts';
import { PredictEventValues } from '../../../../../../UI/Predict/constants/eventNames';
import {
  PREDICT_EMPTY_STATE_CTA_NAMES,
  type PredictEmptyStateCtaName,
} from '../../../../abTestConfig';
import { useCurrentCryptoUpDownMarketData } from '../../../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData';
import { usePredictNavigation } from '../../../../../../UI/Predict/hooks/usePredictNavigation';
import { selectPredictEnabledFlag } from '../../../../../../UI/Predict/selectors/featureFlags';
import {
  HOMEPAGE_PREDICT_EVENT_SLOTS,
  HOMEPAGE_PREDICT_SERIES_SLOT,
} from '../../constants/homepagePredictMarketSlots';
import type { UseHomepagePredictMarketSlotsResult } from '../../hooks/useHomepagePredictMarketSlots';
import type { PredictionsTrendingHeaderTestId } from '../../predictionsSectionTypes';
import type { TransactionActiveAbTestEntry } from '../../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import BtcLiveRow from './BtcLiveRow';
import ChampionshipRow, { type ChampionshipRowState } from './ChampionshipRow';

export interface HomepagePredictWorldCupDiscoveryProps {
  title: string;
  onViewAll: (
    transactionActiveAbTests?: TransactionActiveAbTestEntry[],
  ) => void;
  headerTestIdKey: PredictionsTrendingHeaderTestId;
  marketSlots: UseHomepagePredictMarketSlotsResult;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  onTreatmentCtaClick?: (
    ctaName: PredictEmptyStateCtaName,
    categoryName?: string,
  ) => void;
}

const HomepagePredictWorldCupDiscovery: React.FC<
  HomepagePredictWorldCupDiscoveryProps
> = ({
  title,
  onViewAll,
  headerTestIdKey,
  marketSlots,
  transactionActiveAbTests,
  onTreatmentCtaClick,
}) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { navigateToMarketDetails } = usePredictNavigation();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const {
    marketId: btcMarketId,
    market: btcWindowMarket,
    currentPrice: btcSpotUsd,
    priceToBeat,
    countdown: btcCountdown,
  } = useCurrentCryptoUpDownMarketData({
    series: HOMEPAGE_PREDICT_SERIES_SLOT.series,
    enabled: isPredictEnabled && isFocused,
  });
  const eventSlotRows = useMemo<ChampionshipRowState[]>(
    () =>
      HOMEPAGE_PREDICT_EVENT_SLOTS.map(({ id, slug }) => {
        const market = marketSlots.marketData.find(
          (candidate) => candidate.id === id && candidate.slug === slug,
        );
        if (market) {
          return { kind: 'market', market, detailsTitle: undefined };
        }
        return marketSlots.isFetching ? { kind: 'loading' } : { kind: 'empty' };
      }),
    [marketSlots.isFetching, marketSlots.marketData],
  );

  const handleBtcRow = useCallback(() => {
    onTreatmentCtaClick?.(
      PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
      'crypto',
    );
    if (btcMarketId) {
      navigateToMarketDetails(
        {
          marketId: btcMarketId,
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
          title:
            btcWindowMarket?.title ?? HOMEPAGE_PREDICT_SERIES_SLOT.series.title,
          image: btcWindowMarket?.image,
          ...(transactionActiveAbTests?.length && {
            transactionActiveAbTests,
          }),
        },
        { throughRoot: true },
      );
      return;
    }
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
        tab: 'crypto',
        ...(transactionActiveAbTests?.length && { transactionActiveAbTests }),
      },
    });
  }, [
    btcMarketId,
    btcWindowMarket?.image,
    btcWindowMarket?.title,
    navigateToMarketDetails,
    navigation,
    onTreatmentCtaClick,
    transactionActiveAbTests,
  ]);

  const handleViewAll = useCallback(() => {
    onTreatmentCtaClick?.(PREDICT_EMPTY_STATE_CTA_NAMES.EXPLORE_FEATURED);
    onViewAll(transactionActiveAbTests);
  }, [onTreatmentCtaClick, onViewAll, transactionActiveAbTests]);
  const handleChampionshipRowPress = useCallback(() => {
    onTreatmentCtaClick?.(
      PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
      'sports',
    );
  }, [onTreatmentCtaClick]);

  return (
    <>
      <SectionDivider />
      <SectionHeader
        title={title}
        isInteractive
        onPress={handleViewAll}
        testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE(headerTestIdKey)}
      />
      <PredictEntryPointProvider
        entryPoint={PredictEventValues.ENTRY_POINT.HOME_SECTION}
      >
        <Box twClassName="px-4">
          <BtcLiveRow
            onPress={handleBtcRow}
            btcSpotUsd={btcSpotUsd}
            priceToBeat={priceToBeat}
            countdown={btcCountdown}
          />
          {eventSlotRows.map((state, index) => (
            <ChampionshipRow
              key={HOMEPAGE_PREDICT_EVENT_SLOTS[index].id}
              state={state}
              onPress={handleChampionshipRowPress}
              transactionActiveAbTests={transactionActiveAbTests}
              testID={`homepage-predict-discovery-market-slot-${index + 2}`}
            />
          ))}
        </Box>
      </PredictEntryPointProvider>
    </>
  );
};

export default HomepagePredictWorldCupDiscovery;
